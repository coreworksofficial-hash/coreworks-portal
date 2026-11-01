/**
 * Pure Node.js Android APK Builder & Signer (v1 JAR + v2 APK Signature Scheme)
 * Builds a standalone, dependency-free, installable Android APK wrapping an HTML5 game.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// ============================================================================
// 1. PNG Icon Generator (Generates a vibrant 192x192 Donburi Tower App Icon)
// ============================================================================
function createIconPng(width = 192, height = 192) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Rounded rect background mask
      const ax = Math.max(0, Math.abs(nx) - 0.65);
      const ay = Math.max(0, Math.abs(ny) - 0.65);
      const cornerDist = Math.sqrt(ax * ax + ay * ay);
      if (cornerDist > 0.32) {
        rawData[px] = 0; rawData[px + 1] = 0; rawData[px + 2] = 0; rawData[px + 3] = 0;
        continue;
      }

      // Sunburst background (Orange/Red Japanese festival style)
      const angle = Math.atan2(ny, nx);
      const ray = Math.sin(angle * 12) > 0;
      let r = ray ? 255 : 235;
      let g = ray ? 140 : 75;
      let b = ray ? 30 : 25;

      // White/Gold border
      if (cornerDist > 0.27) {
        r = 255; g = 215; b = 60;
      }

      // Draw stacked food items (Pudding on top, Shrimp tempura, Rice mound, Red Donburi bowl)
      // 1. Donburi Bowl (bottom half: ny in [0.18, 0.72])
      if (ny >= 0.18 && ny <= 0.72) {
        const bowlWidth = 0.68 * Math.sqrt(Math.max(0, 1 - Math.pow((ny - 0.18) / 0.56, 1.8)));
        if (Math.abs(nx) <= bowlWidth) {
          r = 210; g = 30; b = 30; // Red lacquer bowl
          if (ny < 0.26 || (ny > 0.62 && Math.abs(nx) < bowlWidth * 0.8)) {
            r = 255; g = 210; b = 50; // Gold rim & base
          } else if (Math.abs(ny - 0.34) < 0.04) {
            r = 255; g = 210; b = 50; // Gold stripe
          }
        }
      }
      // Bowl foot
      if (ny > 0.68 && ny <= 0.78 && Math.abs(nx) <= 0.26) {
        r = 180; g = 20; b = 20;
      }

      // 2. White Rice Mound (centered at ny = 0.14)
      const riceDist = Math.sqrt(Math.pow(nx / 0.60, 2) + Math.pow((ny - 0.16) / 0.28, 2));
      if (ny <= 0.20 && riceDist <= 1.0) {
        r = 252; g = 250; b = 245;
        if (riceDist > 0.88) { r = 225; g = 220; b = 210; }
      }

      // 3. Giant Custard Pudding stacked on rice (ny in [-0.36, 0.02])
      if (ny >= -0.36 && ny <= 0.02) {
        const t = (ny - (-0.36)) / 0.38; // 0 at top, 1 at bottom
        const pWidth = 0.28 + t * 0.16;
        if (Math.abs(nx) <= pWidth) {
          if (t < 0.28) {
            r = 115; g = 45; b = 15; // Caramel top
          } else {
            r = 255; g = 225; b = 75; // Custard yellow
          }
          if (Math.abs(nx - (-pWidth * 0.55)) < 0.05 && t > 0.3) {
            r = 255; g = 248; b = 170; // Highlight
          }
        }
      }

      // 4. Cherry / Shrimp top accent (ny around -0.48)
      const cherryDist = Math.sqrt(Math.pow(nx - 0.0, 2) + Math.pow(ny - (-0.48), 2));
      if (cherryDist <= 0.13) {
        r = 240; g = 25; b = 60;
        if (Math.sqrt(Math.pow(nx + 0.04, 2) + Math.pow(ny + 0.52, 2)) < 0.04) {
          r = 255; g = 180; b = 190;
        }
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = 255;
    }
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ============================================================================
// 2. Binary Android String Pool Builder (UTF-16LE for AXML & resources.arsc)
// ============================================================================
function buildStringPoolUTF16(strings) {
  const count = strings.length;
  const offsets = [];
  const strBuffers = [];
  let currentOffset = 0;

  for (const s of strings) {
    offsets.push(currentOffset);
    const u16 = Buffer.from(s, 'utf16le');
    const charLen = s.length;
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16LE(charLen, 0);
    const nulBuf = Buffer.alloc(2, 0);
    const combined = Buffer.concat([lenBuf, u16, nulBuf]);
    strBuffers.push(combined);
    currentOffset += combined.length;
  }

  let stringsData = Buffer.concat(strBuffers);
  const pad = (4 - (stringsData.length % 4)) % 4;
  if (pad > 0) {
    stringsData = Buffer.concat([stringsData, Buffer.alloc(pad, 0)]);
  }

  const headerSize = 28;
  const offsetsSize = count * 4;
  const stringsStart = headerSize + offsetsSize;
  const totalSize = stringsStart + stringsData.length;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0x0001, 0); // RES_STRING_POOL_TYPE
  header.writeUInt16LE(headerSize, 2);
  header.writeUInt32LE(totalSize, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt32LE(0, 12); // styleCount
  header.writeUInt32LE(0, 16); // flags: 0 = UTF-16
  header.writeUInt32LE(stringsStart, 20);
  header.writeUInt32LE(0, 24); // stylesStart

  const offsetsBuf = Buffer.alloc(offsetsSize);
  for (let i = 0; i < count; i++) {
    offsetsBuf.writeUInt32LE(offsets[i], i * 4);
  }

  return Buffer.concat([header, offsetsBuf, stringsData]);
}

// ============================================================================
// 3. Binary AndroidManifest.xml (AXML) Generator
// ============================================================================
function buildAndroidManifestAXML(packageName, appLabel) {
  // Attribute resource IDs in android.* must be sorted in ascending order per element!
  const ATTR_IDS = {
    theme: 0x01010000,
    label: 0x01010001,
    icon: 0x01010002,
    name: 0x01010003,
    screenOrientation: 0x0101001e,
    configChanges: 0x0101001f,
    versionCode: 0x0101021b,
    versionName: 0x0101021c,
    minSdkVersion: 0x0101020c,
    targetSdkVersion: 0x01010270,
    hardwareAccelerated: 0x010102d3,
    exported: 0x01010010,
  };

  // Strings with resource IDs MUST come first in the string pool!
  const resStrings = [
    'theme',               // 0
    'label',               // 1
    'icon',                // 2
    'name',                // 3
    'exported',            // 4
    'screenOrientation',   // 5
    'configChanges',       // 6
    'minSdkVersion',       // 7
    'versionCode',         // 8
    'versionName',         // 9
    'targetSdkVersion',    // 10
    'hardwareAccelerated'  // 11
  ];
  const resIdNumbers = [
    0x01010000, // theme
    0x01010001, // label
    0x01010002, // icon
    0x01010003, // name
    0x01010010, // exported
    0x0101001e, // screenOrientation
    0x0101001f, // configChanges
    0x0101020c, // minSdkVersion
    0x0101021b, // versionCode
    0x0101021c, // versionName
    0x01010270, // targetSdkVersion
    0x010102d3  // hardwareAccelerated
  ];

  const otherStrings = [
    'android',
    'http://schemas.android.com/apk/res/android',
    '',
    'manifest',
    'package',
    packageName,
    '1.0.0',
    'uses-sdk',
    'application',
    appLabel,
    'activity',
    packageName + '.MainActivity',
    'intent-filter',
    'action',
    'android.intent.action.MAIN',
    'category',
    'android.intent.category.LAUNCHER'
  ];

  const allStrings = [...resStrings, ...otherStrings];
  const strIdx = (s) => {
    const idx = allStrings.indexOf(s);
    if (idx === -1) throw new Error(`Missing AXML string: ${s}`);
    return idx;
  };

  const stringPoolChunk = buildStringPoolUTF16(allStrings);

  // Resource Map Chunk (0x0180)
  const resMapHeaderSize = 8;
  const resMapTotalSize = resMapHeaderSize + resIdNumbers.length * 4;
  const resMapChunk = Buffer.alloc(resMapTotalSize);
  resMapChunk.writeUInt16LE(0x0180, 0);
  resMapChunk.writeUInt16LE(resMapHeaderSize, 2);
  resMapChunk.writeUInt32LE(resMapTotalSize, 4);
  for (let i = 0; i < resIdNumbers.length; i++) {
    resMapChunk.writeUInt32LE(resIdNumbers[i], 8 + i * 4);
  }

  const NS_URI = strIdx('http://schemas.android.com/apk/res/android');
  const NS_PREFIX = strIdx('android');
  const NO_STR = 0xffffffff;

  function makeNamespaceChunk(isStart, line = 1) {
    const buf = Buffer.alloc(24);
    buf.writeUInt16LE(isStart ? 0x0100 : 0x0101, 0);
    buf.writeUInt16LE(16, 2);
    buf.writeUInt32LE(24, 4);
    buf.writeUInt32LE(line, 8);
    buf.writeUInt32LE(NO_STR, 12);
    buf.writeUInt32LE(NS_PREFIX, 16);
    buf.writeUInt32LE(NS_URI, 20);
    return buf;
  }

  // Value types:
  // 0x01: TYPE_REFERENCE
  // 0x03: TYPE_STRING
  // 0x10: TYPE_INT_DEC
  // 0x11: TYPE_INT_HEX
  // 0x12: TYPE_INT_BOOLEAN
  function attrString(ns, nameStr, valStr) {
    return {
      ns,
      name: strIdx(nameStr),
      rawValue: strIdx(valStr),
      type: 0x03,
      data: strIdx(valStr)
    };
  }
  function attrInt(ns, nameStr, val, hex = false) {
    return {
      ns,
      name: strIdx(nameStr),
      rawValue: NO_STR,
      type: hex ? 0x11 : 0x10,
      data: val >>> 0
    };
  }
  function attrBool(ns, nameStr, val) {
    return {
      ns,
      name: strIdx(nameStr),
      rawValue: NO_STR,
      type: 0x12,
      data: val ? 0xffffffff : 0x00000000
    };
  }
  function attrRef(ns, nameStr, resId) {
    return {
      ns,
      name: strIdx(nameStr),
      rawValue: NO_STR,
      type: 0x01,
      data: resId >>> 0
    };
  }

  function makeStartElement(nameStr, attrs, line = 1) {
    const totalSize = 36 + attrs.length * 20;
    const buf = Buffer.alloc(totalSize);
    buf.writeUInt16LE(0x0102, 0); // RES_XML_START_ELEMENT_TYPE
    buf.writeUInt16LE(16, 2);     // headerSize
    buf.writeUInt32LE(totalSize, 4);
    buf.writeUInt32LE(line, 8);
    buf.writeUInt32LE(NO_STR, 12); // comment
    buf.writeUInt32LE(NO_STR, 16); // ns
    buf.writeUInt32LE(strIdx(nameStr), 20);
    buf.writeUInt16LE(20, 24);     // attributeStart
    buf.writeUInt16LE(20, 26);     // attributeSize
    buf.writeUInt16LE(attrs.length, 28);
    buf.writeUInt16LE(0, 30);      // idIndex
    buf.writeUInt16LE(0, 32);      // classIndex
    buf.writeUInt16LE(0, 34);      // styleIndex

    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      const off = 36 + i * 20;
      buf.writeUInt32LE(a.ns, off + 0);
      buf.writeUInt32LE(a.name, off + 4);
      buf.writeUInt32LE(a.rawValue, off + 8);
      buf.writeUInt16LE(8, off + 12); // size of Res_value
      buf.writeUInt8(0, off + 14);    // res0
      buf.writeUInt8(a.type, off + 15);
      buf.writeUInt32LE(a.data, off + 16);
    }
    return buf;
  }

  function makeEndElement(nameStr, line = 1) {
    const buf = Buffer.alloc(24);
    buf.writeUInt16LE(0x0103, 0); // RES_XML_END_ELEMENT_TYPE
    buf.writeUInt16LE(16, 2);
    buf.writeUInt32LE(24, 4);
    buf.writeUInt32LE(line, 8);
    buf.writeUInt32LE(NO_STR, 12);
    buf.writeUInt32LE(NO_STR, 16);
    buf.writeUInt32LE(strIdx(nameStr), 20);
    return buf;
  }

  // Note: attributes with resource IDs must be ordered by their resource IDs!
  const xmlNodes = [
    makeNamespaceChunk(true, 1),

    // <manifest android:versionCode="1" android:versionName="1.0.0" package="...">
    makeStartElement('manifest', [
      attrInt(NS_URI, 'versionCode', 1),
      attrString(NS_URI, 'versionName', '1.0.0'),
      attrString(NO_STR, 'package', packageName),
    ], 2),

    // <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    makeStartElement('uses-sdk', [
      attrInt(NS_URI, 'minSdkVersion', 21),
      attrInt(NS_URI, 'targetSdkVersion', 33),
    ], 3),
    makeEndElement('uses-sdk', 3),

    // <application android:label="..." android:icon="@drawable/icon" android:hardwareAccelerated="true">
    // Resource IDs order: label (0x01010001), icon (0x01010002), hardwareAccelerated (0x010102d3)
    makeStartElement('application', [
      attrString(NS_URI, 'label', appLabel),
      attrRef(NS_URI, 'icon', 0x7f010000),
      attrBool(NS_URI, 'hardwareAccelerated', true),
    ], 4),

    // <activity android:theme="@android:style/Theme.NoTitleBar.Fullscreen" android:label="..." android:name="..." android:exported="true" android:screenOrientation="portrait" android:configChanges="0x04a0">
    // Resource IDs order:
    // theme (0x01010000), label (0x01010001), name (0x01010003), exported (0x01010010), screenOrientation (0x0101001e), configChanges (0x0101001f)
    makeStartElement('activity', [
      attrRef(NS_URI, 'theme', 0x01030007), // Theme.NoTitleBar.Fullscreen
      attrString(NS_URI, 'label', appLabel),
      attrString(NS_URI, 'name', packageName + '.MainActivity'),
      attrBool(NS_URI, 'exported', true),
      attrInt(NS_URI, 'screenOrientation', 1), // portrait = 1
      attrInt(NS_URI, 'configChanges', 0x04a0, true), // keyboardHidden(0x20)|orientation(0x80)|screenSize(0x400)
    ], 5),

    // <intent-filter>
    makeStartElement('intent-filter', [], 6),
    makeStartElement('action', [attrString(NS_URI, 'name', 'android.intent.action.MAIN')], 7),
    makeEndElement('action', 7),
    makeStartElement('category', [attrString(NS_URI, 'name', 'android.intent.category.LAUNCHER')], 8),
    makeEndElement('category', 8),
    makeEndElement('intent-filter', 6),

    makeEndElement('activity', 5),
    makeEndElement('application', 4),
    makeEndElement('manifest', 2),
    makeNamespaceChunk(false, 9)
  ];

  const body = Buffer.concat([stringPoolChunk, resMapChunk, ...xmlNodes]);
  const header = Buffer.alloc(8);
  header.writeUInt16LE(0x0003, 0); // RES_XML_TYPE
  header.writeUInt16LE(8, 2);
  header.writeUInt32LE(8 + body.length, 4);

  return Buffer.concat([header, body]);
}

// ============================================================================
// 4. Binary resources.arsc Generator (Maps 0x7f010000 -> res/drawable/icon.png)
// ============================================================================
function buildResourcesArsc(packageName) {
  // Global string pool: index 0 = "res/drawable/icon.png"
  const globalStringPool = buildStringPoolUTF16(['res/drawable/icon.png']);
  // Type string pool: index 0 = "drawable"
  const typeStringPool = buildStringPoolUTF16(['drawable']);
  // Key string pool: index 0 = "icon"
  const keyStringPool = buildStringPoolUTF16(['icon']);

  // RES_TABLE_TYPE_SPEC_TYPE (0x0202)
  const typeSpec = Buffer.alloc(20);
  typeSpec.writeUInt16LE(0x0202, 0);
  typeSpec.writeUInt16LE(16, 2);
  typeSpec.writeUInt32LE(20, 4);
  typeSpec.writeUInt8(1, 8); // id = 1 (drawable)
  typeSpec.writeUInt8(0, 9);
  typeSpec.writeUInt16LE(0, 10);
  typeSpec.writeUInt32LE(1, 12); // entryCount = 1
  typeSpec.writeUInt32LE(0, 16); // flags for entry 0

  // RES_TABLE_TYPE_TYPE (0x0201)
  // Header is 52 bytes (20 fixed + 32-byte ResTable_config) + 1*4 bytes offsets + 16 bytes entry+value = 72 bytes
  const typeChunk = Buffer.alloc(72, 0);
  typeChunk.writeUInt16LE(0x0201, 0);
  typeChunk.writeUInt16LE(52, 2); // header size (20 + 32-byte ResTable_config)
  typeChunk.writeUInt32LE(72, 4); // total size
  typeChunk.writeUInt8(1, 8);    // id = 1
  typeChunk.writeUInt8(0, 9);
  typeChunk.writeUInt16LE(0, 10);
  typeChunk.writeUInt32LE(1, 12); // entryCount = 1
  typeChunk.writeUInt32LE(56, 16); // entriesStart = 52 + 4
  typeChunk.writeUInt32LE(32, 20); // config.size = 32 (52 - 20 = 32)
  // offset[0] at byte 52 = 0
  typeChunk.writeUInt32LE(0, 52);
  // ResTable_entry at byte 56:
  typeChunk.writeUInt16LE(8, 56); // size = 8
  typeChunk.writeUInt16LE(0, 58); // flags = 0
  typeChunk.writeUInt32LE(0, 60); // key index in keyStringPool = 0 ("icon")
  // Res_value at byte 64:
  typeChunk.writeUInt16LE(8, 64); // size = 8
  typeChunk.writeUInt8(0, 66);    // res0 = 0
  typeChunk.writeUInt8(0x03, 67); // dataType = TYPE_STRING (file path in global string pool)
  typeChunk.writeUInt32LE(0, 68); // data = 0 ("res/drawable/icon.png")

  const pkgHeaderSize = 288;
  const typeStringsOffset = pkgHeaderSize;
  const keyStringsOffset = typeStringsOffset + typeStringPool.length;
  const pkgBody = Buffer.concat([typeStringPool, keyStringPool, typeSpec, typeChunk]);
  const pkgTotalSize = pkgHeaderSize + pkgBody.length;

  const pkgHeader = Buffer.alloc(pkgHeaderSize, 0);
  pkgHeader.writeUInt16LE(0x0200, 0); // RES_TABLE_PACKAGE_TYPE
  pkgHeader.writeUInt16LE(pkgHeaderSize, 2);
  pkgHeader.writeUInt32LE(pkgTotalSize, 4);
  pkgHeader.writeUInt32LE(0x7f, 8); // id = 0x7f
  // Package name UTF-16LE (up to 128 chars at offset 12)
  Buffer.from(packageName, 'utf16le').copy(pkgHeader, 12);
  pkgHeader.writeUInt32LE(typeStringsOffset, 268);
  pkgHeader.writeUInt32LE(1, 272); // lastPublicType
  pkgHeader.writeUInt32LE(keyStringsOffset, 276);
  pkgHeader.writeUInt32LE(1, 280); // lastPublicKey
  pkgHeader.writeUInt32LE(0, 284); // typeIdOffset

  const pkgChunk = Buffer.concat([pkgHeader, pkgBody]);

  const tableHeaderSize = 12;
  const tableTotalSize = tableHeaderSize + globalStringPool.length + pkgChunk.length;
  const tableHeader = Buffer.alloc(tableHeaderSize);
  tableHeader.writeUInt16LE(0x0002, 0); // RES_TABLE_TYPE
  tableHeader.writeUInt16LE(tableHeaderSize, 2);
  tableHeader.writeUInt32LE(tableTotalSize, 4);
  tableHeader.writeUInt32LE(1, 8); // packageCount = 1

  return Buffer.concat([tableHeader, globalStringPool, pkgChunk]);
}

// ============================================================================
// 5. Dalvik Executable (classes.dex) Compiler
//    Compiles com.kusoge.donburitower.MainActivity extends android.app.Activity
//    which launches a full-screen hardware-accelerated WebView with JS & DOMStorage
//    and handles Back button navigation.
// ============================================================================
function buildClassesDex() {
  function writeULEB128(val) {
    const bytes = [];
    do {
      let b = val & 0x7f;
      val >>>= 7;
      if (val !== 0) b |= 0x80;
      bytes.push(b);
    } while (val !== 0);
    return Buffer.from(bytes);
  }

  // DEX requires strings to be strictly sorted in UTF-16 code unit order
  const rawStrings = [
    '<init>',
    'L',
    'LL',
    'LZ',
    'Landroid/app/Activity;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/view/Window;',
    'Landroid/webkit/WebChromeClient;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Lcom/kusoge/donburitower/MainActivity;',
    'Ljava/lang/String;',
    'V',
    'VL',
    'VZ',
    'Z',
    'canGoBack',
    'file:///android_asset/index.html',
    'getSettings',
    'getWindow',
    'goBack',
    'loadUrl',
    'onBackPressed',
    'onCreate',
    'requestFeature',
    'setContentView',
    'setDomStorageEnabled',
    'setJavaScriptEnabled',
    'setMediaPlaybackRequiresUserGesture',
    'setWebChromeClient',
    'setWebViewClient',
    'webView'
  ];

  // Verify lexicographical sort order
  const strings = [...rawStrings].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const strIdx = (s) => {
    const i = strings.indexOf(s);
    if (i === -1) throw new Error(`DEX string not found: ${s}`);
    return i;
  };

  // Type descriptors sorted by string_idx
  const rawTypes = [
    'Landroid/app/Activity;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebChromeClient;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Lcom/kusoge/donburitower/MainActivity;',
    'Ljava/lang/String;',
    'V',
    'Z'
  ].sort((a, b) => strIdx(a) - strIdx(b));

  const typeIdx = (t) => {
    const i = rawTypes.indexOf(t);
    if (i === -1) throw new Error(`DEX type not found: ${t}`);
    return i;
  };

  // Prototypes: (shorty, returnType, [paramTypes])
  const rawProtos = [
    { shorty: 'V', ret: 'V', params: [] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/os/Bundle;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/view/View;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/webkit/WebChromeClient;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/webkit/WebViewClient;'] },
    { shorty: 'VL', ret: 'V', params: ['Ljava/lang/String;'] },
    { shorty: 'VZ', ret: 'V', params: ['Z'] },
    { shorty: 'L', ret: 'Landroid/webkit/WebSettings;', params: [] },
    { shorty: 'Z', ret: 'Z', params: [] },
  ];

  // Sort protos by (return_type_idx, parameters_type_idx[])
  rawProtos.sort((a, b) => {
    const ra = typeIdx(a.ret);
    const rb = typeIdx(b.ret);
    if (ra !== rb) return ra - rb;
    const len = Math.min(a.params.length, b.params.length);
    for (let i = 0; i < len; i++) {
      const pa = typeIdx(a.params[i]);
      const pb = typeIdx(b.params[i]);
      if (pa !== pb) return pa - pb;
    }
    return a.params.length - b.params.length;
  });

  const protoIdx = (ret, params) => {
    const i = rawProtos.findIndex(
      (p) => p.ret === ret && p.params.length === params.length && p.params.every((x, idx) => x === params[idx])
    );
    if (i === -1) throw new Error(`DEX proto not found: ${ret} (${params.join(',')})`);
    return i;
  };

  // Fields: MainActivity.webView : Landroid/webkit/WebView;
  const fields = [
    { cls: 'Lcom/kusoge/donburitower/MainActivity;', type: 'Landroid/webkit/WebView;', name: 'webView' }
  ];

  // Methods:
  const rawMethods = [
    { cls: 'Landroid/app/Activity;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Landroid/app/Activity;', name: 'onBackPressed', ret: 'V', params: [] },
    { cls: 'Landroid/app/Activity;', name: 'onCreate', ret: 'V', params: ['Landroid/os/Bundle;'] },
    { cls: 'Landroid/app/Activity;', name: 'setContentView', ret: 'V', params: ['Landroid/view/View;'] },
    { cls: 'Landroid/webkit/WebChromeClient;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setDomStorageEnabled', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setJavaScriptEnabled', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setMediaPlaybackRequiresUserGesture', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebView;', name: '<init>', ret: 'V', params: ['Landroid/app/Activity;'] },
    // Wait: WebView constructor takes Landroid/content/Context;! Let's include Landroid/content/Context; in types & strings!
  ];
  // Hold on! Let's make sure WebView.<init>(Landroid/content/Context;) has Context in strings and types!
  return buildClassesDexWithContext(writeULEB128);
}

function buildClassesDexWithContext(writeULEB128) {
  const rawStrings = [
    '<init>',
    'L',
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebChromeClient;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Lcom/kusoge/donburitower/MainActivity;',
    'Ljava/lang/String;',
    'V',
    'VL',
    'VZ',
    'Z',
    'canGoBack',
    'file:///android_asset/index.html',
    'getSettings',
    'goBack',
    'loadUrl',
    'onBackPressed',
    'onCreate',
    'setContentView',
    'setDomStorageEnabled',
    'setJavaScriptEnabled',
    'setMediaPlaybackRequiresUserGesture',
    'setWebChromeClient',
    'setWebViewClient',
    'webView'
  ];

  const strings = [...rawStrings].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const strIdx = (s) => {
    const i = strings.indexOf(s);
    if (i === -1) throw new Error(`DEX string not found: ${s}`);
    return i;
  };

  const rawTypes = [
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebChromeClient;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Lcom/kusoge/donburitower/MainActivity;',
    'Ljava/lang/String;',
    'V',
    'Z'
  ].sort((a, b) => strIdx(a) - strIdx(b));

  const typeIdx = (t) => {
    const i = rawTypes.indexOf(t);
    if (i === -1) throw new Error(`DEX type not found: ${t}`);
    return i;
  };

  const rawProtos = [
    { shorty: 'V', ret: 'V', params: [] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/content/Context;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/os/Bundle;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/view/View;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/webkit/WebChromeClient;'] },
    { shorty: 'VL', ret: 'V', params: ['Landroid/webkit/WebViewClient;'] },
    { shorty: 'VL', ret: 'V', params: ['Ljava/lang/String;'] },
    { shorty: 'VZ', ret: 'V', params: ['Z'] },
    { shorty: 'L', ret: 'Landroid/webkit/WebSettings;', params: [] },
    { shorty: 'Z', ret: 'Z', params: [] },
  ];

  rawProtos.sort((a, b) => {
    const ra = typeIdx(a.ret);
    const rb = typeIdx(b.ret);
    if (ra !== rb) return ra - rb;
    const len = Math.min(a.params.length, b.params.length);
    for (let i = 0; i < len; i++) {
      const pa = typeIdx(a.params[i]);
      const pb = typeIdx(b.params[i]);
      if (pa !== pb) return pa - pb;
    }
    return a.params.length - b.params.length;
  });

  const protoIdx = (ret, params) => {
    const i = rawProtos.findIndex(
      (p) => p.ret === ret && p.params.length === params.length && p.params.every((x, idx) => x === params[idx])
    );
    if (i === -1) throw new Error(`DEX proto not found: ${ret} (${params.join(',')})`);
    return i;
  };

  const fields = [
    { cls: 'Lcom/kusoge/donburitower/MainActivity;', type: 'Landroid/webkit/WebView;', name: 'webView' }
  ];

  const rawMethods = [
    { cls: 'Landroid/app/Activity;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Landroid/app/Activity;', name: 'onBackPressed', ret: 'V', params: [] },
    { cls: 'Landroid/app/Activity;', name: 'onCreate', ret: 'V', params: ['Landroid/os/Bundle;'] },
    { cls: 'Landroid/app/Activity;', name: 'setContentView', ret: 'V', params: ['Landroid/view/View;'] },
    { cls: 'Landroid/webkit/WebChromeClient;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setDomStorageEnabled', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setJavaScriptEnabled', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebSettings;', name: 'setMediaPlaybackRequiresUserGesture', ret: 'V', params: ['Z'] },
    { cls: 'Landroid/webkit/WebView;', name: '<init>', ret: 'V', params: ['Landroid/content/Context;'] },
    { cls: 'Landroid/webkit/WebView;', name: 'canGoBack', ret: 'Z', params: [] },
    { cls: 'Landroid/webkit/WebView;', name: 'getSettings', ret: 'Landroid/webkit/WebSettings;', params: [] },
    { cls: 'Landroid/webkit/WebView;', name: 'goBack', ret: 'V', params: [] },
    { cls: 'Landroid/webkit/WebView;', name: 'loadUrl', ret: 'V', params: ['Ljava/lang/String;'] },
    { cls: 'Landroid/webkit/WebView;', name: 'setWebChromeClient', ret: 'V', params: ['Landroid/webkit/WebChromeClient;'] },
    { cls: 'Landroid/webkit/WebView;', name: 'setWebViewClient', ret: 'V', params: ['Landroid/webkit/WebViewClient;'] },
    { cls: 'Landroid/webkit/WebViewClient;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Lcom/kusoge/donburitower/MainActivity;', name: '<init>', ret: 'V', params: [] },
    { cls: 'Lcom/kusoge/donburitower/MainActivity;', name: 'onBackPressed', ret: 'V', params: [] },
    { cls: 'Lcom/kusoge/donburitower/MainActivity;', name: 'onCreate', ret: 'V', params: ['Landroid/os/Bundle;'] },
  ];

  // Sort methods by (class_idx, name_idx, proto_idx)
  rawMethods.sort((a, b) => {
    const ca = typeIdx(a.cls), cb = typeIdx(b.cls);
    if (ca !== cb) return ca - cb;
    const na = strIdx(a.name), nb = strIdx(b.name);
    if (na !== nb) return na - nb;
    return protoIdx(a.ret, a.params) - protoIdx(b.ret, b.params);
  });

  const methodIdx = (cls, name, ret, params = []) => {
    const i = rawMethods.findIndex(
      (m) => m.cls === cls && m.name === name && m.ret === ret && m.params.length === params.length
    );
    if (i === -1) throw new Error(`DEX method not found: ${cls}->${name}`);
    return i;
  };

  // Dalvik Bytecode Helper (16-bit code units)
  function u16(val) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(val & 0xffff, 0);
    return b;
  }

  // Method 1: MainActivity.<init>()V
  // registers_size = 1, ins_size = 1, outs_size = 1
  // invoke-direct {v0}, Landroid/app/Activity;-><init>()V  (70 10 <mIdx> 00 00)
  // return-void                                            (0e 00)
  const codeInitInsns = Buffer.concat([
    u16(0x1070), u16(methodIdx('Landroid/app/Activity;', '<init>', 'V')), u16(0x0000),
    u16(0x000e)
  ]);

  // Method 2: MainActivity.onBackPressed()V
  // registers_size = 2 (v0 = temp, v1 = this), ins_size = 1, outs_size = 1
  // iget-object v0, v1, MainActivity->webView (54 10 <fieldIdx=0>)
  // if-eqz v0, +9 code units (38 00 09 00)
  // invoke-virtual {v0}, WebView->canGoBack()Z (6e 10 <mIdx> 00 00)
  // move-result v0 (0a 00)
  // if-eqz v0, +4 code units (38 00 04 00)
  // iget-object v0, v1, MainActivity->webView (54 10 00 00)
  // invoke-virtual {v0}, WebView->goBack()V (6e 10 <mIdx> 00 00)
  // return-void (0e 00)
  const codeBackInsns = Buffer.concat([
    u16(0x1054), u16(0),                         // 0..1: iget-object v0, v1, field@0
    u16(0x0038), u16(10),                        // 2..3: if-eqz v0, +10 (to offset 12: return-void)
    u16(0x106e), u16(methodIdx('Landroid/webkit/WebView;', 'canGoBack', 'Z')), u16(0x0000), // 4..6
    u16(0x000a),                                 // 7: move-result v0
    u16(0x0038), u16(6),                         // 8..9: if-eqz v0, +6 (to offset 14: return-void)
    u16(0x1054), u16(0),                         // 10..11: iget-object v0, v1, field@0
    u16(0x106e), u16(methodIdx('Landroid/webkit/WebView;', 'goBack', 'V')), u16(0x0000), // 12..14
    u16(0x000e)                                  // 15: return-void (Note: prevents accidental exit on back tap!)
  ]);
  // Fix branch targets for codeBackInsns:
  // At unit 2 (`if-eqz v0`): target is unit 15 -> offset = 15 - 2 = 13!
  // At unit 8 (`if-eqz v0`): target is unit 15 -> offset = 15 - 8 = 7!
  codeBackInsns.writeUInt16LE(13, 2 * 2);
  codeBackInsns.writeUInt16LE(7, 8 * 2);

  // Method 3: MainActivity.onCreate(Bundle)V
  // registers_size = 5 (v0, v1, v2, v3 = this, v4 = savedInstanceState), ins_size = 2, outs_size = 2
  const codeOnCreateInsns = Buffer.concat([
    // invoke-super {v3, v4}, Activity.onCreate(Bundle)V
    u16(0x206f), u16(methodIdx('Landroid/app/Activity;', 'onCreate', 'V', ['Landroid/os/Bundle;'])), u16(0x0043),
    // new-instance v0, Landroid/webkit/WebView;
    u16(0x0022), u16(typeIdx('Landroid/webkit/WebView;')),
    // invoke-direct {v0, v3}, WebView.<init>(Context)V
    u16(0x2070), u16(methodIdx('Landroid/webkit/WebView;', '<init>', 'V', ['Landroid/content/Context;'])), u16(0x0030),
    // iput-object v0, v3, MainActivity->webView
    u16(0x305b), u16(0),
    // invoke-virtual {v0}, WebView.getSettings()WebSettings
    u16(0x106e), u16(methodIdx('Landroid/webkit/WebView;', 'getSettings', 'Landroid/webkit/WebSettings;')), u16(0x0000),
    // move-result-object v1
    u16(0x010c),
    // const/4 v2, #1 (0x1212: op=0x12, A=2, B=1 -> byte0=0x12, byte1=0x12 -> 0x1212)
    u16(0x1212),
    // invoke-virtual {v1, v2}, WebSettings.setJavaScriptEnabled(Z)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebSettings;', 'setJavaScriptEnabled', 'V', ['Z'])), u16(0x0021),
    // invoke-virtual {v1, v2}, WebSettings.setDomStorageEnabled(Z)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebSettings;', 'setDomStorageEnabled', 'V', ['Z'])), u16(0x0021),
    // const/4 v2, #0 (0x0212)
    u16(0x0212),
    // invoke-virtual {v1, v2}, WebSettings.setMediaPlaybackRequiresUserGesture(Z)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebSettings;', 'setMediaPlaybackRequiresUserGesture', 'V', ['Z'])), u16(0x0021),
    // new-instance v1, Landroid/webkit/WebViewClient;
    u16(0x0122), u16(typeIdx('Landroid/webkit/WebViewClient;')),
    // invoke-direct {v1}, WebViewClient.<init>()V
    u16(0x1070), u16(methodIdx('Landroid/webkit/WebViewClient;', '<init>', 'V')), u16(0x0001),
    // invoke-virtual {v0, v1}, WebView.setWebViewClient(WebViewClient)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebView;', 'setWebViewClient', 'V', ['Landroid/webkit/WebViewClient;'])), u16(0x0010),
    // new-instance v1, Landroid/webkit/WebChromeClient;
    u16(0x0122), u16(typeIdx('Landroid/webkit/WebChromeClient;')),
    // invoke-direct {v1}, WebChromeClient.<init>()V
    u16(0x1070), u16(methodIdx('Landroid/webkit/WebChromeClient;', '<init>', 'V')), u16(0x0001),
    // invoke-virtual {v0, v1}, WebView.setWebChromeClient(WebChromeClient)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebView;', 'setWebChromeClient', 'V', ['Landroid/webkit/WebChromeClient;'])), u16(0x0010),
    // invoke-virtual {v3, v0}, Activity.setContentView(View)V
    u16(0x206e), u16(methodIdx('Landroid/app/Activity;', 'setContentView', 'V', ['Landroid/view/View;'])), u16(0x0003),
    // const-string v1, "file:///android_asset/index.html"
    u16(0x011a), u16(strIdx('file:///android_asset/index.html')),
    // invoke-virtual {v0, v1}, WebView.loadUrl(String)V
    u16(0x206e), u16(methodIdx('Landroid/webkit/WebView;', 'loadUrl', 'V', ['Ljava/lang/String;'])), u16(0x0010),
    // return-void
    u16(0x000e)
  ]);

  function makeCodeItem(registersSize, insSize, outsSize, insnsBuf) {
    const header = Buffer.alloc(16);
    header.writeUInt16LE(registersSize, 0);
    header.writeUInt16LE(insSize, 2);
    header.writeUInt16LE(outsSize, 4);
    header.writeUInt16LE(0, 6); // tries_size
    header.writeUInt32LE(0, 8); // debug_info_off
    header.writeUInt32LE(insnsBuf.length / 2, 12); // insns_size in 16-bit code units
    const raw = Buffer.concat([header, insnsBuf]);
    const pad = (4 - (raw.length % 4)) % 4;
    return pad ? Buffer.concat([raw, Buffer.alloc(pad, 0)]) : raw;
  }

  const codeItemInit = makeCodeItem(1, 1, 1, codeInitInsns);
  const codeItemBack = makeCodeItem(2, 1, 1, codeBackInsns);
  const codeItemOnCreate = makeCodeItem(5, 2, 2, codeOnCreateInsns);

  // Calculate fixed table layout
  const HEADER_SIZE = 0x70; // 112
  const stringIdsSize = strings.length * 4;
  const typeIdsSize = rawTypes.length * 4;
  const protoIdsSize = rawProtos.length * 12;
  const fieldIdsSize = fields.length * 8;
  const methodIdsSize = rawMethods.length * 8;
  const classDefsSize = 1 * 32;

  const stringIdsOff = HEADER_SIZE;
  const typeIdsOff = stringIdsOff + stringIdsSize;
  const protoIdsOff = typeIdsOff + typeIdsSize;
  const fieldIdsOff = protoIdsOff + protoIdsSize;
  const methodIdsOff = fieldIdsOff + fieldIdsSize;
  const classDefsOff = methodIdsOff + methodIdsSize;
  const dataOff = classDefsOff + classDefsSize;

  let curOffset = dataOff;
  const align4 = () => {
    const p = (4 - (curOffset % 4)) % 4;
    curOffset += p;
    return p;
  };

  // 1. type_list (for protos with parameters)
  const uniqueParamLists = [];
  const paramListOffsets = new Map();
  for (const p of rawProtos) {
    if (p.params.length > 0) {
      const key = p.params.join(',');
      if (!paramListOffsets.has(key)) {
        align4();
        paramListOffsets.set(key, curOffset);
        const buf = Buffer.alloc(4 + p.params.length * 2);
        buf.writeUInt32LE(p.params.length, 0);
        p.params.forEach((pt, idx) => buf.writeUInt16LE(typeIdx(pt), 4 + idx * 2));
        const pad = (4 - (buf.length % 4)) % 4;
        const padded = pad ? Buffer.concat([buf, Buffer.alloc(pad, 0)]) : buf;
        uniqueParamLists.push(padded);
        curOffset += padded.length;
      }
    }
  }
  const typeListSection = Buffer.concat(uniqueParamLists);

  // 2. code_item section (4-byte aligned)
  align4();
  const codeInitOff = curOffset;
  curOffset += codeItemInit.length;
  const codeBackOff = curOffset;
  curOffset += codeItemBack.length;
  const codeOnCreateOff = curOffset;
  curOffset += codeItemOnCreate.length;
  const codeSection = Buffer.concat([codeItemInit, codeItemBack, codeItemOnCreate]);

  // 3. string_data_item section
  const stringDataOffsets = [];
  const stringDataBuffers = [];
  for (const s of strings) {
    stringDataOffsets.push(curOffset);
    const utf8 = Buffer.from(s, 'utf8');
    const lenBuf = writeULEB128(s.length);
    const item = Buffer.concat([lenBuf, utf8, Buffer.from([0])]);
    stringDataBuffers.push(item);
    curOffset += item.length;
  }
  const stringDataSection = Buffer.concat(stringDataBuffers);

  // 4. class_data_item section
  const classDataOff = curOffset;
  const initMIdx = methodIdx('Lcom/kusoge/donburitower/MainActivity;', '<init>', 'V');
  const backMIdx = methodIdx('Lcom/kusoge/donburitower/MainActivity;', 'onBackPressed', 'V');
  const onCreateMIdx = methodIdx('Lcom/kusoge/donburitower/MainActivity;', 'onCreate', 'V', ['Landroid/os/Bundle;']);

  // Virtual methods must be ordered by method_idx!
  const vMethods = [
    { idx: backMIdx, flags: 0x0001, codeOff: codeBackOff },      // public onBackPressed
    { idx: onCreateMIdx, flags: 0x0004, codeOff: codeOnCreateOff } // protected onCreate
  ].sort((a, b) => a.idx - b.idx);

  const classDataBuf = Buffer.concat([
    writeULEB128(0), // static_fields_size = 0
    writeULEB128(1), // instance_fields_size = 1 (webView)
    writeULEB128(1), // direct_methods_size = 1 (<init>)
    writeULEB128(2), // virtual_methods_size = 2 (onBackPressed, onCreate)
    // instance field 0: field_idx_diff = 0, access_flags = 0x0002 (private)
    writeULEB128(0),
    writeULEB128(0x0002),
    // direct method 0: <init>
    writeULEB128(initMIdx),
    writeULEB128(0x10001), // ACC_PUBLIC | ACC_CONSTRUCTOR
    writeULEB128(codeInitOff),
    // virtual method 0:
    writeULEB128(vMethods[0].idx),
    writeULEB128(vMethods[0].flags),
    writeULEB128(vMethods[0].codeOff),
    // virtual method 1:
    writeULEB128(vMethods[1].idx - vMethods[0].idx),
    writeULEB128(vMethods[1].flags),
    writeULEB128(vMethods[1].codeOff),
  ]);
  curOffset += classDataBuf.length;

  // Pad to 4-byte alignment before map_list
  const preMapPadLen = align4();
  const preMapPad = Buffer.alloc(preMapPadLen, 0);

  // 5. map_list section (Mandatory in DEX format!)
  const mapOff = curOffset;
  const mapItems = [
    { type: 0x0000, size: 1, offset: 0 },                       // TYPE_HEADER_ITEM
    { type: 0x0001, size: strings.length, offset: stringIdsOff }, // TYPE_STRING_ID_ITEM
    { type: 0x0002, size: rawTypes.length, offset: typeIdsOff },  // TYPE_TYPE_ID_ITEM
    { type: 0x0003, size: rawProtos.length, offset: protoIdsOff },// TYPE_PROTO_ID_ITEM
    { type: 0x0004, size: fields.length, offset: fieldIdsOff },   // TYPE_FIELD_ID_ITEM
    { type: 0x0005, size: rawMethods.length, offset: methodIdsOff }, // TYPE_METHOD_ID_ITEM
    { type: 0x0006, size: 1, offset: classDefsOff },            // TYPE_CLASS_DEF_ITEM
    { type: 0x1001, size: uniqueParamLists.length, offset: dataOff }, // TYPE_TYPE_LIST
    { type: 0x2001, size: 3, offset: codeInitOff },             // TYPE_CODE_ITEM
    { type: 0x2002, size: strings.length, offset: stringDataOffsets[0] }, // TYPE_STRING_DATA_ITEM
    { type: 0x2000, size: 1, offset: classDataOff },            // TYPE_CLASS_DATA_ITEM
    { type: 0x1000, size: 1, offset: mapOff },                  // TYPE_MAP_LIST
  ];
  const mapListBuf = Buffer.alloc(4 + mapItems.length * 12);
  mapListBuf.writeUInt32LE(mapItems.length, 0);
  mapItems.forEach((m, idx) => {
    const off = 4 + idx * 12;
    mapListBuf.writeUInt16LE(m.type, off + 0);
    mapListBuf.writeUInt16LE(0, off + 2);
    mapListBuf.writeUInt32LE(m.size, off + 4);
    mapListBuf.writeUInt32LE(m.offset, off + 8);
  });
  curOffset += mapListBuf.length;

  const fileSize = curOffset;
  const dataSize = fileSize - dataOff;

  // Build ID tables
  const stringIdsBuf = Buffer.alloc(stringIdsSize);
  stringDataOffsets.forEach((off, i) => stringIdsBuf.writeUInt32LE(off, i * 4));

  const typeIdsBuf = Buffer.alloc(typeIdsSize);
  rawTypes.forEach((t, i) => typeIdsBuf.writeUInt32LE(strIdx(t), i * 4));

  const protoIdsBuf = Buffer.alloc(protoIdsSize);
  rawProtos.forEach((p, i) => {
    const off = i * 12;
    protoIdsBuf.writeUInt32LE(strIdx(p.shorty), off + 0);
    protoIdsBuf.writeUInt32LE(typeIdx(p.ret), off + 4);
    protoIdsBuf.writeUInt32LE(p.params.length ? paramListOffsets.get(p.params.join(',')) : 0, off + 8);
  });

  const fieldIdsBuf = Buffer.alloc(fieldIdsSize);
  fields.forEach((f, i) => {
    const off = i * 8;
    fieldIdsBuf.writeUInt16LE(typeIdx(f.cls), off + 0);
    fieldIdsBuf.writeUInt16LE(typeIdx(f.type), off + 2);
    fieldIdsBuf.writeUInt32LE(strIdx(f.name), off + 4);
  });

  const methodIdsBuf = Buffer.alloc(methodIdsSize);
  rawMethods.forEach((m, i) => {
    const off = i * 8;
    methodIdsBuf.writeUInt16LE(typeIdx(m.cls), off + 0);
    methodIdsBuf.writeUInt16LE(protoIdx(m.ret, m.params), off + 2);
    methodIdsBuf.writeUInt32LE(strIdx(m.name), off + 4);
  });

  const classDefsBuf = Buffer.alloc(classDefsSize, 0);
  classDefsBuf.writeUInt32LE(typeIdx('Lcom/kusoge/donburitower/MainActivity;'), 0);
  classDefsBuf.writeUInt32LE(0x0001, 4); // ACC_PUBLIC
  classDefsBuf.writeUInt32LE(typeIdx('Landroid/app/Activity;'), 8);
  classDefsBuf.writeUInt32LE(0, 12);     // interfaces_off
  classDefsBuf.writeUInt32LE(0xffffffff, 16); // source_file_idx = NO_INDEX
  classDefsBuf.writeUInt32LE(0, 20);     // annotations_off
  classDefsBuf.writeUInt32LE(classDataOff, 24);
  classDefsBuf.writeUInt32LE(0, 28);     // static_values_off

  const header = Buffer.alloc(HEADER_SIZE, 0);
  Buffer.from('dex\n035\0', 'ascii').copy(header, 0);
  header.writeUInt32LE(fileSize, 32);
  header.writeUInt32LE(HEADER_SIZE, 36);
  header.writeUInt32LE(0x12345678, 40); // ENDIAN_CONSTANT
  header.writeUInt32LE(0, 44);          // link_size
  header.writeUInt32LE(0, 48);          // link_off
  header.writeUInt32LE(mapOff, 52);
  header.writeUInt32LE(strings.length, 56);
  header.writeUInt32LE(stringIdsOff, 60);
  header.writeUInt32LE(rawTypes.length, 64);
  header.writeUInt32LE(typeIdsOff, 68);
  header.writeUInt32LE(rawProtos.length, 72);
  header.writeUInt32LE(protoIdsOff, 76);
  header.writeUInt32LE(fields.length, 80);
  header.writeUInt32LE(fieldIdsOff, 84);
  header.writeUInt32LE(rawMethods.length, 88);
  header.writeUInt32LE(methodIdsOff, 92);
  header.writeUInt32LE(1, 96);
  header.writeUInt32LE(classDefsOff, 100);
  header.writeUInt32LE(dataSize, 104);
  header.writeUInt32LE(dataOff, 108);

  const dexBuf = Buffer.concat([
    header,
    stringIdsBuf,
    typeIdsBuf,
    protoIdsBuf,
    fieldIdsBuf,
    methodIdsBuf,
    classDefsBuf,
    typeListSection,
    codeSection,
    stringDataSection,
    classDataBuf,
    preMapPad,
    mapListBuf
  ]);

  // Compute SHA-1 signature over bytes 32..end
  const sha1 = crypto.createHash('sha1').update(dexBuf.subarray(32)).digest();
  sha1.copy(dexBuf, 12);

  // Compute Adler32 checksum over bytes 12..end
  let a = 1, b = 0;
  for (let i = 12; i < dexBuf.length; i++) {
    a = (a + dexBuf[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler32 = ((b << 16) | a) >>> 0;
  dexBuf.writeUInt32LE(adler32, 8);

  return dexBuf;
}

// ============================================================================
// 6. ASN.1 DER / X.509 Certificate & PKCS#7 CMS Builder + APK Signature v2
// ============================================================================
function derLen(len) {
  if (len < 128) return Buffer.from([len]);
  const hex = len.toString(16);
  const padded = hex.length % 2 ? '0' + hex : hex;
  const bytes = Buffer.from(padded, 'hex');
  return Buffer.concat([Buffer.from([0x80 | bytes.length]), bytes]);
}
function derTag(tag, content) {
  return Buffer.concat([Buffer.from([tag]), derLen(content.length), content]);
}
function derSeq(...items) { return derTag(0x30, Buffer.concat(items)); }
function derSet(...items) { return derTag(0x31, Buffer.concat(items)); }
function derOctetString(buf) { return derTag(0x04, buf); }
function derBitString(buf) { return derTag(0x03, Buffer.concat([Buffer.from([0x00]), buf])); }
function derInt(numOrBuf) {
  let b = Buffer.isBuffer(numOrBuf) ? numOrBuf : Buffer.from([numOrBuf]);
  while (b.length > 1 && b[0] === 0 && (b[1] & 0x80) === 0) b = b.subarray(1);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0x00]), b]);
  return derTag(0x02, b);
}
function derOid(oidStr) {
  const parts = oidStr.split('.').map(Number);
  const bytes = [40 * parts[0] + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    const tmp = [v & 0x7f];
    v = Math.floor(v / 128);
    while (v > 0) {
      tmp.unshift((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    bytes.push(...tmp);
  }
  return derTag(0x06, Buffer.from(bytes));
}
function derUtf8(str) { return derTag(0x0c, Buffer.from(str, 'utf8')); }
function derPrintable(str) { return derTag(0x13, Buffer.from(str, 'ascii')); }
function derUtcTime(str) { return derTag(0x17, Buffer.from(str, 'ascii')); }

function generateKeyAndCert() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001
  });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

  // X.509 v3 TBSCertificate
  const algSha256WithRsa = derSeq(derOid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00]));
  const nameRdn = derSeq(
    derSet(derSeq(derOid('2.5.4.6'), derPrintable('JP'))),
    derSet(derSeq(derOid('2.5.4.10'), derUtf8('KusogeFactory'))),
    derSet(derSeq(derOid('2.5.4.3'), derUtf8('BakumoriDonburiTower')))
  );
  const validity = derSeq(
    derUtcTime('240101000000Z'),
    derUtcTime('491231235959Z')
  );
  const tbsCert = derSeq(
    derTag(0xa0, derInt(2)), // v3
    derInt(Buffer.from([0x01, 0x23, 0x45, 0x67])),
    algSha256WithRsa,
    nameRdn,
    validity,
    nameRdn,
    spkiDer
  );

  const sig = crypto.sign('sha256', tbsCert, privateKey);
  const certDer = derSeq(tbsCert, algSha256WithRsa, derBitString(sig));
  return { privateKey, publicKey, spkiDer, certDer, nameRdn };
}

function buildPkcs7Signature(sfBytes, certDer, nameRdn, privateKey) {
  const sig = crypto.sign('sha256', sfBytes, privateKey);
  const algSha256 = derSeq(derOid('2.16.840.1.101.3.4.2.1'), Buffer.from([0x05, 0x00]));
  const algRsaEncryption = derSeq(derOid('1.2.840.113549.1.1.1'), Buffer.from([0x05, 0x00]));
  const issuerAndSerial = derSeq(nameRdn, derInt(Buffer.from([0x01, 0x23, 0x45, 0x67])));

  const signerInfo = derSeq(
    derInt(1),
    issuerAndSerial,
    algSha256,
    algRsaEncryption,
    derOctetString(sig)
  );

  const signedData = derSeq(
    derInt(1),
    derSet(algSha256),
    derSeq(derOid('1.2.840.113549.1.7.1')), // pkcs7-data
    derTag(0xa0, certDer),
    derSet(signerInfo)
  );

  return derSeq(
    derOid('1.2.840.113549.1.7.2'), // pkcs7-signedData
    derTag(0xa0, signedData)
  );
}

// APK Signature Scheme v2 Builder (Android 7.0 - 15+)
function computeApkV2ChunkDigest(sections) {
  const CHUNK_SIZE = 1024 * 1024;
  const chunkDigests = [];
  let totalChunks = 0;

  for (const sec of sections) {
    let offset = 0;
    while (offset < sec.length) {
      const slice = sec.subarray(offset, Math.min(offset + CHUNK_SIZE, sec.length));
      const header = Buffer.alloc(5);
      header[0] = 0xa5;
      header.writeUInt32LE(slice.length, 1);
      const d = crypto.createHash('sha256').update(header).update(slice).digest();
      chunkDigests.push(d);
      totalChunks++;
      offset += CHUNK_SIZE;
    }
  }

  const topHeader = Buffer.alloc(5);
  topHeader[0] = 0x5a;
  topHeader.writeUInt32LE(totalChunks, 1);
  return crypto.createHash('sha256').update(topHeader).update(Buffer.concat(chunkDigests)).digest();
}

function lenPrefixed(buf) {
  const l = Buffer.alloc(4);
  l.writeUInt32LE(buf.length, 0);
  return Buffer.concat([l, buf]);
}

function buildApkSignatureBlockV2(localFilesBuf, cdBuf, eocdBuf, certDer, spkiDer, privateKey) {
  // Modify EOCD CD offset in temporary copy to point to where the v2 block starts (= localFilesBuf.length)
  const eocdForDigest = Buffer.from(eocdBuf);
  eocdForDigest.writeUInt32LE(localFilesBuf.length, 16);

  const topDigest = computeApkV2ChunkDigest([localFilesBuf, cdBuf, eocdForDigest]);

  // signature algorithm ID: 0x0103 = RSASSA-PKCS1-v1_5 with SHA2-256
  const SIG_ALG_ID = 0x0103;

  const algIdBuf = Buffer.alloc(4);
  algIdBuf.writeUInt32LE(SIG_ALG_ID, 0);
  const digestEntry = lenPrefixed(Buffer.concat([algIdBuf, lenPrefixed(topDigest)]));
  const digestsSeq = lenPrefixed(digestEntry);

  const certsSeq = lenPrefixed(lenPrefixed(certDer));
  const attrsSeq = lenPrefixed(Buffer.alloc(0)); // empty additional attributes

  // signed data structure (without its own outer length prefix when signing!)
  const signedDataContent = Buffer.concat([
    digestsSeq,
    certsSeq,
    attrsSeq
  ]);

  // Sign signedDataContent using RSASSA-PKCS1-v1_5 with SHA-256
  const sigBytes = crypto.sign('sha256', signedDataContent, privateKey);
  const signatureEntry = lenPrefixed(Buffer.concat([algIdBuf, lenPrefixed(sigBytes)]));
  const signaturesSeq = lenPrefixed(signatureEntry);

  const signerBlock = lenPrefixed(Buffer.concat([
    lenPrefixed(signedDataContent),
    signaturesSeq,
    lenPrefixed(spkiDer)
  ]));
  const signersSeq = lenPrefixed(signerBlock);

  // Pair: uint64 size (4 + value.length), uint32 id (0x7109871a), value (signersSeq)
  const pairSize = 4 + signersSeq.length;
  const pairBuf = Buffer.alloc(8 + 4 + signersSeq.length);
  pairBuf.writeBigUInt64LE(BigInt(pairSize), 0);
  pairBuf.writeUInt32LE(0x7109871a, 8);
  signersSeq.copy(pairBuf, 12);

  // Total size of block (excluding initial uint64 size field) = pairBuf.length + 8 (size2) + 16 (magic)
  const blockSizeField = BigInt(pairBuf.length + 8 + 16);
  const headSize = Buffer.alloc(8);
  headSize.writeBigUInt64LE(blockSizeField, 0);
  const tailSize = Buffer.alloc(8);
  tailSize.writeBigUInt64LE(blockSizeField, 0);
  const magic = Buffer.from('APK Sig Block 42', 'ascii');

  return Buffer.concat([headSize, pairBuf, tailSize, magic]);
}

// ============================================================================
// 7. Aligned ZIP + APK Packager (v1 + v2 signed)
// ============================================================================
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildSignedApk(filesMap, outputPath) {
  const { privateKey, spkiDer, certDer, nameRdn } = generateKeyAndCert();

  // Build v1 META-INF/MANIFEST.MF, CERT.SF, CERT.RSA
  let manifestLines = [
    'Manifest-Version: 1.0',
    'Created-By: 1.0 (Android Kusoge APK Builder)',
    ''
  ];
  const entryDigests = [];
  for (const [name, item] of filesMap.entries()) {
    const sha256 = crypto.createHash('sha256').update(item.data).digest('base64');
    const sec = `Name: ${name}\r\nSHA-256-Digest: ${sha256}\r\n\r\n`;
    entryDigests.push({ name, sec });
    manifestLines.push(`Name: ${name}`, `SHA-256-Digest: ${sha256}`, '');
  }
  const manifestBytes = Buffer.from(manifestLines.join('\r\n'), 'utf8');
  const mainManifestSha256 = crypto.createHash('sha256').update(manifestBytes).digest('base64');

  let sfLines = [
    'Signature-Version: 1.0',
    'Created-By: 1.0 (Android Kusoge APK Builder)',
    `SHA-256-Digest-Manifest: ${mainManifestSha256}`,
    ''
  ];
  for (const e of entryDigests) {
    const secHash = crypto.createHash('sha256').update(Buffer.from(e.sec, 'utf8')).digest('base64');
    sfLines.push(`Name: ${e.name}`, `SHA-256-Digest: ${secHash}`, '');
  }
  const sfBytes = Buffer.from(sfLines.join('\r\n'), 'utf8');
  const rsaBytes = buildPkcs7Signature(sfBytes, certDer, nameRdn, privateKey);

  const allEntries = [
    ...Array.from(filesMap.entries()).map(([name, item]) => ({ name, data: item.data, compress: item.compress })),
    { name: 'META-INF/MANIFEST.MF', data: manifestBytes, compress: true },
    { name: 'META-INF/CERT.SF', data: sfBytes, compress: true },
    { name: 'META-INF/CERT.RSA', data: rsaBytes, compress: true }
  ];

  const localChunks = [];
  const cdChunks = [];
  let currentOffset = 0;

  for (const entry of allEntries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressedCrc = crc32(entry.data);
    const uncompressedSize = entry.data.length;

    let method = 0; // STORED
    let payload = entry.data;
    if (entry.compress) {
      const deflated = zlib.deflateRawSync(entry.data, { level: 9 });
      if (deflated.length < entry.data.length) {
        method = 8; // DEFLATED
        payload = deflated;
      }
    }

    // 4-byte zipalign for STORED (uncompressed) entries!
    let extraBuf = Buffer.alloc(0);
    if (method === 0) {
      const dataStart = currentOffset + 30 + nameBuf.length;
      const pad = (4 - (dataStart % 4)) % 4;
      if (pad > 0) extraBuf = Buffer.alloc(pad, 0);
    }

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);        // version needed = 2.0
    lfh.writeUInt16LE(0, 6);         // flags = 0
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(0x0000, 10);   // mod time
    lfh.writeUInt16LE(0x5421, 12);   // mod date
    lfh.writeUInt32LE(uncompressedCrc, 14);
    lfh.writeUInt32LE(payload.length, 18);
    lfh.writeUInt32LE(uncompressedSize, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(extraBuf.length, 28);

    const localRecord = Buffer.concat([lfh, nameBuf, extraBuf, payload]);
    localChunks.push(localRecord);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(0x0000, 12);
    cdh.writeUInt16LE(0x5421, 14);
    cdh.writeUInt32LE(uncompressedCrc, 16);
    cdh.writeUInt32LE(payload.length, 20);
    cdh.writeUInt32LE(uncompressedSize, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30); // extra len in CD = 0
    cdh.writeUInt16LE(0, 32); // comment len
    cdh.writeUInt16LE(0, 34); // disk number
    cdh.writeUInt16LE(0, 36); // internal attrs
    cdh.writeUInt32LE(0, 38); // external attrs
    cdh.writeUInt32LE(currentOffset, 42);

    cdChunks.push(Buffer.concat([cdh, nameBuf]));
    currentOffset += localRecord.length;
  }

  const localFilesBuf = Buffer.concat(localChunks);
  const cdBuf = Buffer.concat(cdChunks);

  // Initial EOCD (before inserting APK Signature Block v2)
  const eocdBuf = Buffer.alloc(22);
  eocdBuf.writeUInt32LE(0x06054b50, 0);
  eocdBuf.writeUInt16LE(0, 4);
  eocdBuf.writeUInt16LE(0, 6);
  eocdBuf.writeUInt16LE(allEntries.length, 8);
  eocdBuf.writeUInt16LE(allEntries.length, 10);
  eocdBuf.writeUInt32LE(cdBuf.length, 12);
  eocdBuf.writeUInt32LE(localFilesBuf.length, 16);
  eocdBuf.writeUInt16LE(0, 20);

  // Build APK Signature Block v2
  const v2SigBlock = buildApkSignatureBlockV2(localFilesBuf, cdBuf, eocdBuf, certDer, spkiDer, privateKey);

  // Update EOCD Central Directory offset to account for v2SigBlock!
  eocdBuf.writeUInt32LE(localFilesBuf.length + v2SigBlock.length, 16);

  const finalApk = Buffer.concat([localFilesBuf, v2SigBlock, cdBuf, eocdBuf]);
  fs.writeFileSync(outputPath, finalApk);
  return { size: finalApk.length, v2BlockSize: v2SigBlock.length, entries: allEntries.length };
}

function buildApkFromHtml(htmlPath, outputPath) {
  const packageName = 'com.kusoge.donburitower';
  const appLabel = '爆盛！どんぶりタワー';

  const manifestBuf = buildAndroidManifestAXML(packageName, appLabel);
  const arscBuf = buildResourcesArsc(packageName);
  const dexBuf = buildClassesDex();
  const iconBuf = createIconPng(192, 192);
  const htmlBuf = fs.readFileSync(htmlPath);

  const filesMap = new Map([
    ['AndroidManifest.xml', { data: manifestBuf, compress: true }],
    ['resources.arsc', { data: arscBuf, compress: false }], // MUST be uncompressed & 4-byte aligned on Android 11+!
    ['classes.dex', { data: dexBuf, compress: true }],
    ['res/drawable/icon.png', { data: iconBuf, compress: false }], // Uncompressed PNG icon
    ['assets/index.html', { data: htmlBuf, compress: true }]
  ]);

  return buildSignedApk(filesMap, outputPath);
}

module.exports = { buildApkFromHtml, createIconPng, buildAndroidManifestAXML, buildResourcesArsc, buildClassesDex };

if (require.main === module) {
  const htmlFile = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const outApk = process.argv[3] || path.join(__dirname, '..', 'BakumoriDonburiTower.apk');
  const info = buildApkFromHtml(htmlFile, outApk);
  console.log(`Built APK successfully: ${outApk} (${info.size} bytes, v2SigBlock=${info.v2BlockSize} bytes)`);
}
