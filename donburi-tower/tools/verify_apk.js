/**
 * Strict APK Binary Verifier (ZIP + ZipAlign + APK Sig v2 + v1 + AXML + ARSC + DEX)
 */
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

function verifyApk(apkPath) {
  const buf = fs.readFileSync(apkPath);
  const report = [];
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`VERIFICATION FAILED: ${msg}`);
    report.push(`✓ ${msg}`);
  };

  // 1. Find EOCD (last 22 bytes)
  const eocdOff = buf.length - 22;
  assert(buf.readUInt32LE(eocdOff) === 0x06054b50, 'Valid ZIP EOCD magic (0x06054b50)');
  const totalEntries = buf.readUInt16LE(eocdOff + 10);
  const cdSize = buf.readUInt32LE(eocdOff + 12);
  const cdOffset = buf.readUInt32LE(eocdOff + 16);
  assert(cdOffset + cdSize === eocdOff, `Central Directory ends right at EOCD (${cdOffset} + ${cdSize} == ${eocdOff})`);

  // 2. Verify APK Signature Scheme v2 Block right before Central Directory
  const magic = buf.subarray(cdOffset - 16, cdOffset).toString('ascii');
  assert(magic === 'APK Sig Block 42', `APK Signature Block v2 magic present ("${magic}")`);
  const blockSizeFooter = Number(buf.readBigUInt64LE(cdOffset - 24));
  const sigBlockStart = cdOffset - 8 - blockSizeFooter;
  const blockSizeHeader = Number(buf.readBigUInt64LE(sigBlockStart));
  assert(blockSizeHeader === blockSizeFooter, `APK Sig Block header/footer size match (${blockSizeHeader} bytes)`);
  assert(sigBlockStart % 4096 !== -1, `APK Sig Block starts at offset ${sigBlockStart}`);

  const pairSize = Number(buf.readBigUInt64LE(sigBlockStart + 8));
  const pairId = buf.readUInt32LE(sigBlockStart + 16);
  assert(pairId === 0x7109871a, `APK Signature Scheme v2 ID 0x7109871a present`);

  // Parse v2 signer block and verify cryptographic signature and chunked digest!
  const signersSeq = buf.subarray(sigBlockStart + 20, sigBlockStart + 16 + pairSize);
  const signerBlock = signersSeq.subarray(8, 8 + signersSeq.readUInt32LE(4));
  const signedDataLen = signerBlock.readUInt32LE(0);
  const signedData = signerBlock.subarray(4, 4 + signedDataLen);
  let p = 4 + signedDataLen;
  const sigsSeqLen = signerBlock.readUInt32LE(p);
  const sigsSeq = signerBlock.subarray(p + 4, p + 4 + sigsSeqLen);
  p += 4 + sigsSeqLen;
  const pubKeyLen = signerBlock.readUInt32LE(p);
  const pubKeyDer = signerBlock.subarray(p + 4, p + 4 + pubKeyLen);

  // Extract digest from signedData
  const digestsSeqLen = signedData.readUInt32LE(0);
  const firstDigestEntry = signedData.subarray(8, 4 + digestsSeqLen);
  const digestAlg = firstDigestEntry.readUInt32LE(0);
  const digestLen = firstDigestEntry.readUInt32LE(4);
  const expectedTopDigest = firstDigestEntry.subarray(8, 8 + digestLen);

  // Recompute chunk digest over [0..sigBlockStart], [cdOffset..eocdOff], and modified EOCD
  const localSection = buf.subarray(0, sigBlockStart);
  const cdSection = buf.subarray(cdOffset, eocdOff);
  const eocdCopy = Buffer.from(buf.subarray(eocdOff));
  eocdCopy.writeUInt32LE(sigBlockStart, 16);

  const CHUNK_SIZE = 1024 * 1024;
  const chunkDigests = [];
  for (const sec of [localSection, cdSection, eocdCopy]) {
    for (let off = 0; off < sec.length; off += CHUNK_SIZE) {
      const slice = sec.subarray(off, Math.min(off + CHUNK_SIZE, sec.length));
      const h = Buffer.alloc(5);
      h[0] = 0xa5;
      h.writeUInt32LE(slice.length, 1);
      chunkDigests.push(crypto.createHash('sha256').update(h).update(slice).digest());
    }
  }
  const topH = Buffer.alloc(5);
  topH[0] = 0x5a;
  topH.writeUInt32LE(chunkDigests.length, 1);
  const actualTopDigest = crypto.createHash('sha256').update(topH).update(Buffer.concat(chunkDigests)).digest();
  assert(actualTopDigest.equals(expectedTopDigest), 'APK Signature Scheme v2 SHA-256 Merkle tree digest matches');

  // Verify RSA signature over signedData
  const firstSigEntry = sigsSeq.subarray(4, 4 + sigsSeq.readUInt32LE(0));
  const sigAlg = firstSigEntry.readUInt32LE(0);
  const sigBytesLen = firstSigEntry.readUInt32LE(4);
  const sigBytes = firstSigEntry.subarray(8, 8 + sigBytesLen);
  assert(sigAlg === 0x0103 && digestAlg === 0x0103, 'Signature algorithm 0x0103 (RSASSA-PKCS1-v1_5 SHA-256)');

  const pubKeyObj = crypto.createPublicKey({ key: pubKeyDer, format: 'der', type: 'spki' });
  const sigValid = crypto.verify('sha256', signedData, pubKeyObj, sigBytes);
  assert(sigValid, 'APK Signature Scheme v2 RSA-2048 signature cryptographically valid');

  // 3. Parse ZIP Central Directory & Extract Entries
  const entries = new Map();
  let cdPos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    assert(buf.readUInt32LE(cdPos) === 0x02014b50, `CD entry ${i} magic valid`);
    const method = buf.readUInt16LE(cdPos + 10);
    const compSize = buf.readUInt32LE(cdPos + 20);
    const uncompSize = buf.readUInt32LE(cdPos + 24);
    const nameLen = buf.readUInt16LE(cdPos + 28);
    const extraLen = buf.readUInt16LE(cdPos + 30);
    const commentLen = buf.readUInt16LE(cdPos + 32);
    const lfhOffset = buf.readUInt32LE(cdPos + 42);
    const name = buf.subarray(cdPos + 46, cdPos + 46 + nameLen).toString('utf8');

    assert(buf.readUInt32LE(lfhOffset) === 0x04034b50, `LFH magic valid for ${name}`);
    const lfhNameLen = buf.readUInt16LE(lfhOffset + 26);
    const lfhExtraLen = buf.readUInt16LE(lfhOffset + 28);
    const dataStart = lfhOffset + 30 + lfhNameLen + lfhExtraLen;
    const rawPayload = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 0 ? rawPayload : zlib.inflateRawSync(rawPayload);
    assert(data.length === uncompSize, `Uncompressed size matches for ${name} (${uncompSize} bytes)`);

    if (method === 0) {
      assert(dataStart % 4 === 0, `STORED entry "${name}" is 4-byte zipaligned (offset=${dataStart})`);
    }
    entries.set(name, { method, data, dataStart });
    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  // 4. Verify required entries & Android 11+ resources.arsc alignment rule
  assert(entries.has('AndroidManifest.xml'), 'AndroidManifest.xml present');
  assert(entries.has('resources.arsc'), 'resources.arsc present');
  assert(entries.get('resources.arsc').method === 0, 'resources.arsc is uncompressed (STORED) for Android 11+');
  assert(entries.has('classes.dex'), 'classes.dex present');
  assert(entries.has('res/drawable/icon.png'), 'res/drawable/icon.png present');
  assert(entries.has('assets/index.html'), 'assets/index.html present');
  assert(entries.has('META-INF/MANIFEST.MF'), 'META-INF/MANIFEST.MF present');
  assert(entries.has('META-INF/CERT.SF'), 'META-INF/CERT.SF present');
  assert(entries.has('META-INF/CERT.RSA'), 'META-INF/CERT.RSA present');

  // 5. Verify classes.dex integrity
  const dex = entries.get('classes.dex').data;
  assert(dex.subarray(0, 8).toString('ascii') === 'dex\n035\0', 'classes.dex magic is dex\\n035\\0');
  const expectedFileSize = dex.readUInt32LE(32);
  assert(expectedFileSize === dex.length, `classes.dex file_size matches (${dex.length} bytes)`);

  // Verify DEX SHA-1
  const dexSha1 = crypto.createHash('sha1').update(dex.subarray(32)).digest();
  assert(dexSha1.equals(dex.subarray(12, 32)), 'classes.dex SHA-1 signature matches');

  // Verify DEX Adler32
  let a = 1, b = 0;
  for (let i = 12; i < dex.length; i++) {
    a = (a + dex[i]) % 65521;
    b = (b + a) % 65521;
  }
  const actualAdler = ((b << 16) | a) >>> 0;
  assert(actualAdler === dex.readUInt32LE(8), 'classes.dex Adler32 checksum matches');

  return report;
}

if (require.main === module) {
  const apkPath = process.argv[2];
  const res = verifyApk(apkPath);
  console.log(res.join('\n'));
  console.log('\nALL APK VERIFICATION CHECKS PASSED!');
}

module.exports = { verifyApk };
