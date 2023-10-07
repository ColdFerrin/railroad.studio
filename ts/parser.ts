import {
    CustomData,
    EngineVersion,
    Gvas,
    GvasHeader,
    GvasString,
    GvasText,
    GvasTextType8,
    GvasTypes,
    RichTextFormat,
    gvasToString,
} from './Gvas';
import {Quaternion} from './Quaternion';
import {Rotator} from './Rotator';
import {Transform} from './Transform';
import {Vector} from './Vector';

/**
 * Parses a GVAS file stored in an ArrayBuffer and returns an object with the
 * contents of the file.
 *
 * The function first checks the magic number at the beginning of the file to
 * verify that it is a GVAS file, and then parses the header data, including the
 * engine version, custom format data, and save game type. After the header, the
 * function reads the data variables stored in the GVAS file. These variables
 * are stored as name-value pairs, where the name is a GvasString and the value
 * is a property of a specific type, such as a boolean, a float, or an array of
 * integers. The function reads the name and type of each variable, and stores
 * them in the _order and _types properties of the result object, respectively.
 * It then reads the value of the variable and stores it in the corresponding
 * property of the result object, depending on its type.
 *
 * @param {ArrayBuffer} buffer
 * @return {Gvas}
 */
export function parseGvas(buffer: ArrayBuffer): Gvas {
    // Parse the header
    const uint8View = new Uint8Array(buffer, 0, 4);
    const magic = String.fromCharCode.apply(null, [...uint8View]);
    if (magic !== 'GVAS') {
        throw new Error('Error reading file: Format doesn\'t start with GVAS.');
    }
    let uint32View = new Uint32Array(buffer, 4, 3);
    const gvasVersion = uint32View[0];
    if (gvasVersion !== 2 && gvasVersion !== 3) {
        throw new Error(`GVAS format version ${gvasVersion} is not supported`);
    }
    const structureVersion = uint32View[1];
    const unknownVersion = gvasVersion === 3 ? uint32View[2] : undefined;
    const engineVersionOffset = gvasVersion === 3 ? 16 : 12;
    let [pos, engineVersion]: [number, EngineVersion] = parseEngineVersion(buffer, engineVersionOffset);
    uint32View = new Uint32Array(buffer.slice(pos, pos + 8));
    pos += 8;
    const customFormatVersion = uint32View[0];
    const nCustomData = uint32View[1];
    const customData: CustomData[] = [];
    for (let i = 0; i < nCustomData; i++) {
        const value = new Uint32Array(buffer.slice(pos, pos + 20));
        pos += 20;
        customData[i] = {
            guid: [...value].slice(0, 4),
            value: value[4],
        };
    }
    let saveType;
    [pos, saveType] = parseString(buffer, pos);
    const header: GvasHeader = {
        gvasVersion,
        structureVersion,
        unknownVersion,
        engineVersion,
        customFormatVersion,
        customData,
        saveType,
    };
    const result: Gvas = {
        _header: header,
        _order: [],
        _types: {},
        boolArrays: {},
        bools: {},
        byteArrays: {},
        floatArrays: {},
        floats: {},
        intArrays: {},
        ints: {},
        rotatorArrays: {},
        stringArrays: {},
        strings: {},
        textArrays: {},
        transformArrays: {},
        vectorArrays: {},
    };
    const largeWorldCoords = (gvasVersion === 3);
    while (pos < buffer.byteLength) {
        let pname; let ptype;
        [pos, pname, ptype] = parseProperty(buffer, pos, result, largeWorldCoords);
        if (!pname) throw new Error('Property name is null');
        if (pname === 'None') break; // End of properties
        result._order.push(pname);
        result._types[pname] = ptype;
    }
    if (pos !== buffer.byteLength) {
        throw new Error(`Found extra data at EOF, pos=${pos}, byteLength=${buffer.byteLength}`);
    }
    return result;
}

function parseEngineVersion(buffer: ArrayBuffer, pos: number): [number, EngineVersion] {
    const uint16View = new Uint16Array(buffer, pos, 3);
    const engineVersionMajor = uint16View[0];
    const engineVersionMinor = uint16View[1];
    const engineVersionPatch = uint16View[2];
    pos += 6;
    const uint32View = new Uint32Array(buffer.slice(pos, pos + 4));
    const engineVersionBuild = uint32View[0];
    pos += 4;
    let engineVersionBuildID;
    [pos, engineVersionBuildID] = parseString(buffer, pos);
    const engineVersion: EngineVersion = {
        major: engineVersionMajor,
        minor: engineVersionMinor,
        patch: engineVersionPatch,
        build: engineVersionBuild,
        buildID: engineVersionBuildID,
    };
    return [pos, engineVersion];
}

function parseQuat(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Quaternion] {
    const structSize = largeWorldCoords ? 32 : 16;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const [x, y, z, w] = values;
    const result = {x, y, z, w};
    return [pos + structSize, result];
}

function parseRotator(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Rotator] {
    const structSize = largeWorldCoords ? 24 : 12;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const result: Rotator = ({
        pitch: values[0], // y (need to confirm)
        yaw: values[1], // Rotation around the Z axis
        roll: values[2], // x (need to confirm)
    });
    return [pos + structSize, result];
}

function parseString(buffer: ArrayBuffer, start: number): [number, GvasString] {
    const pos = start + 4;
    const size = new Int32Array(buffer.slice(start, pos))[0];
    if (size === 0) {
        return [pos, null];
    } else if (size > 0) {
        const uint8View = new Uint8Array(buffer, pos, size);
        const last = size - 1;
        if (uint8View[last] !== 0) throw new Error(`Expected null terminator in ${uint8View}`);
        const excludeNullTerminator = uint8View.subarray(0, last);
        const utf8Decoded = new TextDecoder().decode(excludeNullTerminator);
        return [pos + size, utf8Decoded];
    } else if (size < 0) {
        const sizeBytes = -2 * size;
        const charCodes = new Uint16Array(buffer.slice(pos, pos + sizeBytes));
        const last = -size - 1;
        if (charCodes[last] !== 0) throw new Error(`Expected null terminator in ${charCodes}`);
        const excludeNullTerminator = charCodes.subarray(0, last);
        const str = String.fromCharCode.apply(null, [...excludeNullTerminator]);
        return [pos + sizeBytes, str];
    } else {
        throw new Error(`Unexpected size ${size}`);
    }
}

function parseVector(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Vector] {
    const structSize = largeWorldCoords ? 24 : 12;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const result: Vector = ({
        x: values[0], // East (need to confirm)
        y: values[1], // North (need to confirm)
        z: values[2], // Altitude
    });
    return [pos + structSize, result];
}

function parseProperty(
    b: ArrayBuffer,
    pos: number,
    target: Gvas,
    largeWorldCoords: boolean,
): [number, GvasString, GvasTypes] {
    let pname;
    let ptype: GvasTypes;
    const read = readProperty(b, pos, largeWorldCoords);
    [pos, pname] = read;
    if (!pname || pname === 'None' || read.length === 2) {
        // NoneProperty, bail without storring type info
        return [pos, pname, []];
    } else if (read[2] === 'BoolProperty') {
        ptype = [read[2]];
        target.bools[pname] = read[3];
    } else if (read[2] === 'StrProperty') {
        ptype = [read[2]];
        target.strings[pname] = read[3];
    } else if (read[2] === 'FloatProperty') {
        ptype = [read[2]];
        target.floats[pname] = read[3];
    } else if (read[2] === 'IntProperty') {
        ptype = [read[2]];
        target.ints[pname] = read[3];
    } else if (read[2] !== 'ArrayProperty') {
        throw new Error(`Unexpected Property type: ${read[2]}`);
    } else if (read[3] === 'BoolProperty') {
        ptype = [read[2], read[3]];
        target.boolArrays[pname] = read[4];
    } else if (read[3] === 'IntProperty') {
        ptype = [read[2], read[3]];
        target.intArrays[pname] = read[4];
    } else if (read[3] === 'FloatProperty') {
        ptype = [read[2], read[3]];
        target.floatArrays[pname] = read[4];
    } else if (read[3] === 'StrProperty') {
        ptype = [read[2], read[3]];
        target.stringArrays[pname] = read[4];
    } else if (read[3] === 'TextProperty') {
        ptype = [read[2], read[3]];
        target.textArrays[pname] = read[4];
    } else if (read[3] === 'ByteProperty') {
        ptype = [read[2], read[3]];
        target.byteArrays[pname] = read[4];
    } else if (read[3] !== 'StructProperty') {
        throw new Error(`Unexpected ArrayProperty type: ${read[3]}`);
    } else if (read[4] === 'Vector') {
        ptype = [read[2], read[3], read[4]];
        target.vectorArrays[pname] = read[5];
    } else if (read[4] === 'Rotator') {
        ptype = [read[2], read[3], read[4]];
        target.rotatorArrays[pname] = read[5];
    } else if (read[4] === 'Transform') {
        ptype = [read[2], read[3], read[4]];
        target.transformArrays[pname] = read[5];
    } else {
        throw new Error(`Unexpected StructProperty type: ${read[4]}`);
    }
    target._types[pname] = ptype;
    return [pos, pname, ptype];
}

type ParsePropertyReturnType = (
    | [number, GvasString]
    | [number, GvasString, 'BoolProperty', boolean]
    | [number, GvasString, 'FloatProperty', number]
    | [number, GvasString, 'IntProperty', number]
    | [number, GvasString, 'StrProperty', GvasString]
    | [number, GvasString, 'StructProperty', 'Quat', Quaternion]
    | [number, GvasString, 'StructProperty', 'Vector', Vector]
    | [number, GvasString, 'ArrayProperty', 'BoolProperty', boolean[]]
    | [number, GvasString, 'ArrayProperty', 'ByteProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'FloatProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'IntProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'StrProperty', GvasString[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Rotator', Rotator[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Transform', Transform[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Vector', Vector[]]
    | [number, GvasString, 'ArrayProperty', 'TextProperty', GvasText[]]
);

function readProperty(
    b: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
    earlyExit = false,
): ParsePropertyReturnType {
    // pname
    let pname;
    [pos, pname] = parseString(b, pos);
    if (earlyExit && (!pname || pname === 'None')) {
        return [pos, pname];
    }
    // ptype
    let ptype: GvasString;
    [pos, ptype] = parseString(b, pos);
    if (!pname || pname === 'None') {
        if (ptype !== null) throw new Error(`Unexpected type: ${ptype}`);
        return [pos, pname];
    }
    // plen
    const qword = new Int32Array(b.slice(pos, pos + 8));
    if (qword[1] !== 0) throw new Error(`plen too large: ${qword}`);
    const plen = qword[0];
    pos += 8;
    // ArrayProperty and StructProperty: dtype
    let dtype = null;
    if (ptype === 'ArrayProperty' || ptype === 'StructProperty') {
        [pos, dtype] = parseString(b, pos);
    }
    // BoolProperty: value
    if (ptype === 'BoolProperty') {
        if (plen !== 0) throw new Error(`BoolProperty length !== 0, ${plen}`);
        const c = new Uint8Array(b, pos, 1)[0];
        if (c !== 0 && c !== 1) throw new Error(`Unexpected BoolProperty value: ${c}`);
        pos++;
        // terminator
        const terminator = new Uint8Array(b, pos, 1)[0];
        if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
        pos++;
        // Bail early because plen is zero
        return [pos, pname, ptype, (c !== 0)];
    }
    // StructProperty: guid
    if (ptype === 'StructProperty') {
        const guid = new Uint8Array(b, pos, 16);
        if (guid.some((v) => v !== 0)) throw new Error(`guid !== 0, ${guid}`);
        pos += 16;
    }
    // terminator
    const terminator = new Uint8Array(b, pos, 1)[0];
    if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
    pos++;
    // pdata
    const pdata = b.slice(pos, pos + plen);
    pos += plen;
    if (ptype === 'StrProperty') {
        const [len, result] = parseString(pdata, 0);
        if (plen !== len) throw new Error(`String length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, result];
    } else if (ptype === 'FloatProperty') {
        if (plen !== 4) throw new Error(`FloatProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Float32Array(pdata)[0]];
    } else if (ptype === 'IntProperty') {
        if (plen !== 4) throw new Error(`IntProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Uint32Array(pdata)[0]];
    } else if (ptype === 'StructProperty') {
        if (dtype === 'Quat') {
            const [len, result] = parseQuat(pdata, 0, largeWorldCoords);
            if (plen !== len) throw new Error(`Quat length !== ${len}, ${plen}, ${pdata}`);
            return [pos, pname, ptype, dtype, result];
        } else if (dtype === 'Vector') {
            const [len, result] = parseVector(pdata, 0, largeWorldCoords);
            if (plen !== len) throw new Error(`Vector length !== ${len}, ${plen}, ${pdata}`);
            return [pos, pname, ptype, dtype, result];
        } else {
            throw new Error(`Not yet implemented StructProperty:${dtype}`);
        }
    } else if (ptype !== 'ArrayProperty') {
        throw new Error(`property type for '${pname}' is not implemented ('${ptype}')`);
    } else if (dtype === 'StructProperty') {
        const [stype, sdata] = parseStructArray(pdata, pname, largeWorldCoords);
        if (stype === 'Rotator') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Vector') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Transform') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else {
            throw new Error(gvasToString(stype));
        }
    } else if (dtype === 'BoolProperty') {
        const [len, result] = parseBoolArray(pdata);
        if (plen !== len) throw new Error(`BoolProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'IntProperty') {
        const [len, result] = parseIntArray(pdata);
        if (plen !== len) throw new Error(`IntProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'FloatProperty') {
        const [len, result] = parseFloatArray(pdata);
        if (plen !== len) throw new Error(`FloatProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'StrProperty') {
        const [len, result] = parseStringArray(pdata);
        if (plen !== len) throw new Error(`StrProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'TextProperty') {
        const [len, result] = parseTextArray(pdata);
        if (plen !== len) throw new Error(`TextProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'ByteProperty') {
        return [pos, pname, ptype, dtype, [...new Uint8Array(pdata)]];
    } else {
        throw new Error(`${dtype} data type for '${pname}' is not implemented`);
    }
}

function parseBoolArray(buffer: ArrayBuffer): [number, boolean[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const uint8View = new Uint8Array(buffer, 4, entryCount);
    return [4 + entryCount, [...uint8View].map(Boolean)];
}

function parseIntArray(buffer: ArrayBuffer): [number, number[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const int32View = new Int32Array(buffer, 4, entryCount);
    return [4 + (entryCount * 4), [...int32View]];
}

function parseFloatArray(buffer: ArrayBuffer): [number, number[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const floatView = new Float32Array(buffer, 4, entryCount);
    return [4 + (entryCount * 4), [...floatView]];
}

/**
 * Parse a string array from a buffer.
 * @param {ArrayBuffer} buffer
 * @return {GvasString[]}
 */
function parseStringArray(buffer: ArrayBuffer): [number, GvasString[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    const value = [];
    for (let i = 0; i < entryCount; i++) {
        let str;
        [pos, str] = parseString(buffer, pos);
        value.push(str);
    }
    return [pos, value];
}

type ParseStructArrayReturnType =
    | ['Rotator', Rotator[]]
    | ['Transform', Transform[]]
    | ['Vector', Vector[]]
    ;

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @param {GvasString} expectPropertyName
 * @param {boolean} largeWorldCoords
 * @return {GvasStruct[]}
 */
function parseStructArray(
    buffer: ArrayBuffer,
    expectPropertyName: GvasString,
    largeWorldCoords: boolean,
): ParseStructArrayReturnType {
    // - id: entry_count
    //   type: u4
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    // - id: property_name
    //   type: string
    let propertyName;
    [pos, propertyName] = parseString(buffer, pos);
    if (propertyName !== expectPropertyName) {
        throw new Error(`Expected propertyName = ${expectPropertyName}, ${propertyName}`);
    }
    // - id: struct_property
    //   contents: [15, 0, 0, 0, "StructProperty", 0]
    let structProperty;
    [pos, structProperty] = parseString(buffer, pos);
    if (structProperty !== 'StructProperty') {
        throw new Error(`Invalid struct header: ${structProperty}`);
    }
    // - id: field_size
    //   type: u8
    const fieldSize = new Uint32Array(buffer.slice(pos, pos + 8));
    pos += 8;
    if (fieldSize[1] !== 0) {
        throw new Error(`field_size too large: ${fieldSize[1]}`);
    }
    // - id: field_name
    //   type: string
    let fieldName;
    [pos, fieldName] = parseString(buffer, pos);
    // - id: reserved
    //   size: 17
    const reserved = new Uint8Array(buffer, pos, 17);
    if (reserved.filter(Number).length > 0) {
        throw new Error(`Expected all zeroes ${reserved}`);
    }
    pos += 17;
    // - id: data
    //   size: field_size / entry_count
    //   type:
    //     switch-on: field_name.str
    //     cases:
    //       '"Vector"': vector
    //       '"Rotator"': rotator
    //   repeat: expr
    //   repeat-expr: entryCount
    const value = [];
    const startPos = pos;
    if (fieldName === 'Rotator') {
        for (let i = 0; i < entryCount; i++) {
            let result;
            [pos, result] = parseRotator(buffer, pos, largeWorldCoords);
            value.push(result);
        }
    } else if (fieldName === 'Vector') {
        for (let i = 0; i < entryCount; i++) {
            let result;
            [pos, result] = parseVector(buffer, pos, largeWorldCoords);
            value.push(result);
        }
    } else if (fieldName === 'Transform') {
        console.log(`Reading ${entryCount} Transforms...`);
        for (let i = 0; i < entryCount; i++) {
            let translation: Vector | undefined;
            let rotation: Quaternion | undefined;
            let scale3d: Vector | undefined;
            // Read transform property array.
            while (true) {
                const property = readProperty(buffer, pos, largeWorldCoords, true);
                let pname;
                [pos, pname] = property;
                if (!pname || pname === 'None' || property.length === 2) {
                    // End of property list
                    break;
                } else if (
                    property.length === 5 &&
                    property[2] === 'StructProperty' &&
                    property[3] === 'Quat'
                ) {
                    if (pname === 'Rotation') {
                        rotation = property[4];
                    } else {
                        throw new Error(`Unexpected Quat ${pname}`);
                    }
                } else if (
                    property.length === 5 &&
                    property[2] === 'StructProperty' &&
                    property[3] === 'Vector'
                ) {
                    if (pname === 'Translation') {
                        translation = property[4];
                    } else if (pname === 'Scale3D') {
                        scale3d = property[4];
                    } else {
                        throw new Error(`Unexpected Vector ${pname}`);
                    }
                } else {
                    throw new Error(`Unsupported Transform property type ${property}`);
                }
            }
            if (!translation) throw new Error('Did not find translation');
            if (!rotation) throw new Error('Did not find translation');
            if (!scale3d) throw new Error('Did not find translation');
            const transform: Transform = {translation, rotation, scale3d};
            value.push(transform);
        }
    } else {
        throw new Error(`Unknown field_name: ${fieldName}`);
    }
    if (fieldSize[0] !== pos - startPos) {
        console.error(`field_size !== pos - startPos: ${fieldSize}, ${pos}, ${startPos}`);
    }
    if (pos > buffer.byteLength) {
        throw new Error(
            `${propertyName} Struct[] size ${pos} greater than ArrayProperty data size ${buffer.byteLength}, ` +
            '.sav file is corrupt.');
    }
    if (pos !== buffer.byteLength) {
        console.log(`Warning: Struct[] size ${pos} does not match ArrayProperty data size ${buffer.byteLength}, ` +
            '.sav file may be corrupt. Proceed with caution.');
    }
    if (fieldName === 'Vector') {
        return [fieldName, value as Vector[]];
    } else if (fieldName === 'Rotator') {
        return [fieldName, value as Rotator[]];
    } else if (fieldName === 'Transform') {
        return [fieldName, value as Transform[]];
    } else {
        throw new Error();
    }
}

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @return {GvasText[]}
 */
function parseTextArray(buffer: ArrayBuffer): [number, GvasText[]] {
    // text_array:
    //   seq:
    //     - id: entry_count
    //       type: u4
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    //     - id: body
    //       type: text
    //       repeat: expr
    //       repeat-expr: entry_count
    const array: GvasText[] = [];
    for (let i = 0; i < entryCount; i++) {
        // text:
        //   seq:
        //     - id: component_type
        //       type: u4
        const componentType = new Uint32Array(buffer.slice(pos, pos + 4))[0];
        if (![0, 1, 2, 8].includes(componentType)) throw new Error(`Unexpected component type ${componentType}`);
        pos += 4;
        //     - id: indicator
        //       type: u1
        const indicator = new Uint8Array(buffer, pos, 1)[0];
        const expectedIndicator = componentType === 1 ? 3 : componentType === 8 ? 0 : 255;
        if (indicator !== expectedIndicator) {
            throw new Error(`Unexpected indicator ${indicator} for component type ${componentType}`);
        }
        pos++;
        //     - id: body
        //       type:
        //         switch-on: component_type
        //         cases:
        //           0: text_empty
        //           1: text_rich
        //           2: text_simple
        if (componentType === 0) {
            // text_empty:
            //   seq:
            //     - id: count
            //       contents: [0, 0, 0, 0]
            const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            if (count !== 0) throw new Error(`Expected count == 0, ${count}`);
            array.push(null);
        } else if (componentType === 1) {
            // text_rich:
            //   seq:
            //     - id: flags
            //       contents: [8, 0, 0, 0, 0, 0, 0, 0, 0]
            const numFlags = new Uint8Array(buffer, pos, 1)[0];
            if (numFlags !== 8) throw new Error(`Expected numFlags == 8, ${numFlags}`);
            const flags = new Uint32Array(buffer.slice(pos + 1, pos + 5))[0];
            if (flags !== 0) throw new Error(`Expected flags == 0, ${flags}`);
            pos += 5;
            let unknownStr;
            [pos, unknownStr] = parseString(buffer, pos);
            if (unknownStr && unknownStr.length) throw new Error(`Expected empty str, ${unknownStr}`);
            //     - id: component_guid
            //       type: string
            let componentGuid;
            [pos, componentGuid] = parseString(buffer, pos);
            //     - id: text_format_pattern
            //       type: string
            let textFormatPattern;
            [pos, textFormatPattern] = parseString(buffer, pos);
            //     - id: text_format_arg_count
            //       type: u4
            const textFormatArgCount = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            //     - id: text_format
            //       type: text_format
            //       repeat: expr
            //       repeat-expr: text_format_arg_count
            const textFormat: RichTextFormat[] = [];
            for (let j = 0; j < textFormatArgCount; j++) {
                // textFormat:
                //   seq:
                //     - id: format_key
                //       type: string
                let formatKey;
                [pos, formatKey] = parseString(buffer, pos);
                //     - id: separator
                //       contents: [4]
                const separator = new Uint8Array(buffer, pos++, 1)[0];
                if (separator !== 4) {
                    throw new Error(`Expected separator == 4, ${separator}`);
                }
                //     - id: content_type
                //       type: u4
                const contentType = new Uint32Array(buffer.slice(pos, pos + 4))[0];
                pos += 4;
                //     - id: indicator
                //       contents: [255]
                const indicator = new Uint8Array(buffer, pos++, 1)[0];
                if (indicator !== 255) {
                    throw new Error(`Expected indicator == 255, ${indicator}`);
                }
                //     - id: count
                //       type: u4
                const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
                pos += 4;
                const values = [];
                for (let k = 0; k < count; k++) {
                    // - id: value
                    //   type: string
                    //   repeat: expr
                    //   repeat-expr: count
                    let value;
                    [pos, value] = parseString(buffer, pos);
                    values.push(value);
                }
                textFormat.push({
                    formatKey: formatKey,
                    contentType: contentType,
                    values: values,
                });
            }
            array.push({
                guid: componentGuid,
                pattern: textFormatPattern,
                textFormat: textFormat,
            });
        } else if (componentType === 2) {
            // text_simple:
            //   seq:
            //     - id: count
            //       type: u4
            const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            const values: GvasString[] = [];
            for (let k = 0; k < count; k++) {
                // - id: value
                //   type: string
                //   repeat: expr
                //   repeat-expr: count
                let value;
                [pos, value] = parseString(buffer, pos);
                values.push(value);
            }
            array.push(values);
        } else if (componentType === 8) {
            let unknown;
            let guid;
            let value;
            [pos, unknown] = parseString(buffer, pos);
            [pos, guid] = parseString(buffer, pos);
            [pos, value] = parseString(buffer, pos);
            const values: GvasTextType8 = {unknown, guid, value};
            array.push(values);
        } else {
            throw new Error(`Unknown componentType: ${componentType}`);
        }
    }
    return [pos, array];
}
