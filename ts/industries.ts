import {PathArrayAlias, PathCommand} from '@svgdotjs/svg.js';
import {GvasString} from './Gvas';
import {Industry} from './Railroad';
import {arrow, circle, rect, combine, polyRect, polyRectRel, rotatedRect, rectAbs} from './util-path';

/**
 * Industry type ids, corresponding to the legacy `IndustryTypeArray` property.
 * This format is no longer in use by the current version of Railroads Online.
 */
export enum IndustryType {
    logging_camp = 1,
    sawmill = 2,
    smelter = 3,
    ironworks = 4,
    oil_field = 5,
    refinery = 6,
    coal_mine = 7,
    iron_mine = 8,
    freight_depot = 9,
    firewood_camp = 10,
    engine_house_lightblue = 11,
    engine_house_gold = 12,
    engine_house_red = 13,
    engine_house_brown = 14,
    coaling_tower = 15,
    telegraph_office = 16,
    water_tower_a_red = 20,
    water_tower_a_brown = 21,
    water_tower_a_beige = 22,
    water_tower_a_old = 23,
    water_tower_b_red = 30,
    water_tower_b_brown = 31,
    water_tower_b_beige = 32,
    water_tower_b_old = 33,
    large_engine_house_red = 40,
    large_engine_house_brown = 41,
    large_engine_house_beige = 42,
    large_engine_house_old = 43,
    wood_rick = 44,
}

/**
 * Industry names, corresponding to the modern `IndustryNameArray` property.
 */
export const IndustryNames = [
    'CattleFarm',
    'coalmine',
    'coaltower',
    'enginehouse_alpine',
    'enginehouse_aspen',
    'enginehouse_barn',
    'enginehouse_princess',
    'engineshed_style1',
    'engineshed_style2',
    'engineshed_style3',
    'engineshed_style4',
    'firewooddepot',
    'freightdepot',
    'ironoremine',
    'ironworks',
    'logcamp',
    'MeatPackingPlant',
    'oilfield',
    'Refinery',
    'Sandhouse',
    'sawmill',
    'smelter',
    'telegraphoffice',
    'watertower_1870_style1',
    'watertower_1870_style2',
    'watertower_1870_style3',
    'watertower_1870_style4',
    'watertower_drgw',
    'watertower_kanaskat_style1',
    'watertower_kanaskat_style2',
    'watertower_kanaskat_style3',
    'watertower_kanaskat_style4',
    'watertower_small',
    'WaterWell',
    'WheatFarm',
    'Woodrick',
] as const satisfies readonly string[];

/**
 * Lookup table for converting legacy industry types to names.
 */
export const legacyIndustryNames: Record<IndustryType, IndustryName> = {
    [IndustryType.coal_mine]: 'coalmine',
    [IndustryType.coaling_tower]: 'coaltower',
    [IndustryType.engine_house_brown]: 'enginehouse_princess',
    [IndustryType.engine_house_gold]: 'enginehouse_aspen',
    [IndustryType.engine_house_lightblue]: 'enginehouse_alpine',
    [IndustryType.engine_house_red]: 'enginehouse_barn',
    [IndustryType.firewood_camp]: 'firewooddepot',
    [IndustryType.freight_depot]: 'freightdepot',
    [IndustryType.iron_mine]: 'ironoremine',
    [IndustryType.ironworks]: 'ironworks',
    [IndustryType.large_engine_house_beige]: 'engineshed_style3',
    [IndustryType.large_engine_house_brown]: 'engineshed_style2',
    [IndustryType.large_engine_house_old]: 'engineshed_style4',
    [IndustryType.large_engine_house_red]: 'engineshed_style1',
    [IndustryType.logging_camp]: 'logcamp',
    [IndustryType.oil_field]: 'oilfield',
    [IndustryType.refinery]: 'Refinery',
    [IndustryType.sawmill]: 'sawmill',
    [IndustryType.smelter]: 'smelter',
    [IndustryType.telegraph_office]: 'telegraphoffice',
    [IndustryType.water_tower_a_beige]: 'watertower_1870_style3',
    [IndustryType.water_tower_a_brown]: 'watertower_1870_style2',
    [IndustryType.water_tower_a_old]: 'watertower_1870_style4',
    [IndustryType.water_tower_a_red]: 'watertower_1870_style1',
    [IndustryType.water_tower_b_beige]: 'watertower_kanaskat_style3',
    [IndustryType.water_tower_b_brown]: 'watertower_kanaskat_style2',
    [IndustryType.water_tower_b_old]: 'watertower_kanaskat_style4',
    [IndustryType.water_tower_b_red]: 'watertower_kanaskat_style1',
    [IndustryType.wood_rick]: 'Woodrick',
};

export const isIndustryName = (name: IndustryType | GvasString): name is IndustryName =>
    !!name && (typeof name === 'string') && IndustryNames.includes(name);

export type IndustryName = typeof IndustryNames[number];

export function getIndustryName(industry: Industry): IndustryName | null {
    if (typeof industry.type === 'number') return legacyIndustryNames[industry.type];
    if (isIndustryName(industry.type)) return industry.type;
    return null;
}

export const industryNames: Record<IndustryName, string> = {
    'CattleFarm': 'Cattle Farm',
    'coalmine': 'Coal Mine',
    'coaltower': 'Coaling Tower',
    'enginehouse_alpine': 'Engine House (Alpine Blue)',
    'enginehouse_aspen': 'Engine House (Aspen Gold)',
    'enginehouse_barn': 'Engine House (Barn Red)',
    'enginehouse_princess': 'Engine House (Princess Mineral Brown)',
    'engineshed_style1': 'Large Engine House (Red)',
    'engineshed_style2': 'Large Engine House (Brown)',
    'engineshed_style3': 'Large Engine House (Beige)',
    'engineshed_style4': 'Large Engine House (Old)',
    'firewooddepot': 'Firewood Camp',
    'freightdepot': 'Freight Depot',
    'ironoremine': 'Iron Mine',
    'ironworks': 'Ironworks',
    'logcamp': 'Logging Camp',
    'MeatPackingPlant': 'Meat Packing Plant',
    'oilfield': 'Oil Field',
    'Refinery': 'Refinery',
    'Sandhouse': 'Sandhouse',
    'sawmill': 'Sawmill',
    'smelter': 'Smelter',
    'telegraphoffice': 'Telegraph Office',
    'watertower_1870_style1': '1870 Water Tower (Red)',
    'watertower_1870_style2': '1870 Water Tower (Brown)',
    'watertower_1870_style3': '1870 Water Tower (Beige)',
    'watertower_1870_style4': '1870 Water Tower (Old)',
    'watertower_drgw': 'D&RGW Water Tower',
    'watertower_kanaskat_style1': 'Kanaskat Water Tower (Red)',
    'watertower_kanaskat_style2': 'Kanaskat Water Tower (Brown)',
    'watertower_kanaskat_style3': 'Kanaskat Water Tower (Beige)',
    'watertower_kanaskat_style4': 'Kanaskat Water Tower (Old)',
    'watertower_small': 'Small Water Tower',
    'WaterWell': 'Water Well',
    'WheatFarm': 'Wheat Farm',
    'Woodrick': 'Wood Rick',
};

type FourStrings = [string, string, string, string];
const [input2, input3, input4] = ['Unused Input Slot 2', 'Unused Input Slot 3', 'Unused Input Slot 4'];
const [output2, output3, output4] = ['Unused Output Slot 2', 'Unused Output Slot 3', 'Unused Output Slot 4'];

export const industryInputLabels: Partial<Record<IndustryName, FourStrings>> = {
    'coalmine': ['Beams', 'Rails', input3, input4],
    'ironoremine': ['Lumber', 'Beams', input3, input4],
    'ironworks': ['Raw Iron', 'Coal', 'Lumber', input4],
    'oilfield': ['Steel Pipes', 'Beams', 'Tool Crates', input4],
    'Refinery': ['Crude Oil', 'Steel Pipes', 'Lumber', input4],
    'sawmill': ['Logs', input2, input3, input4],
    'smelter': ['Cordwood', 'Iron Ore', input3, input4],
    'WheatFarm': ['Seed Pallet', 'Water', input3, input4],
    'CattleFarm': ['Grain', 'Water', 'Straw Bale', input4],
    'MeatPackingPlant': ['Cattle', 'Coal', input2, input4],
};

const water: FourStrings = ['Water', output2, output3, output4];
export const industryOutputLabels: Partial<Record<IndustryName, FourStrings>> = {
    'coalmine': ['Coal', output2, output3, output4],
    'coaltower': ['Coal', output2, output3, output4],
    'firewooddepot': ['Firewood', 'Firewood', 'Firewood', 'Firewood'],
    'freightdepot': ['Seed Pallet', output2, output3, output4],
    'ironoremine': ['Iron Ore', output2, output3, output4],
    'ironworks': ['Steel Pipes', 'Tool Crates', output3, output4],
    'logcamp': ['Logs', 'Cordwood', output3, output4],
    'oilfield': ['Crude Oil', output2, output3, output4],
    'Refinery': ['Oil Barrel', output2, output3, output4],
    'Sandhouse': ['Sand', output2, output3, output4],
    'sawmill': ['Lumber', 'Beams', output3, output4],
    'smelter': ['Raw Iron', 'Rails', output3, output4],
    'telegraphoffice': ['Unknown', output2, output3, output4],
    'watertower_1870_style1': water,
    'watertower_1870_style2': water,
    'watertower_1870_style3': water,
    'watertower_1870_style4': water,
    'watertower_drgw': water,
    'watertower_kanaskat_style1': water,
    'watertower_kanaskat_style2': water,
    'watertower_kanaskat_style3': water,
    'watertower_kanaskat_style4': water,
    'watertower_small': water,
    'WaterWell': water,
    'WheatFarm': ['Grain', 'Straw Bale', output3, output4],
    'Woodrick': ['Firewood', 'Firewood', output3, output4],
    'CattleFarm': ['Cattle', 'Cattle', output3, output4],
    'MeatPackingPlant': ['Meat', output2, output3, output4],
};

export const gizmoSvgPaths = {
    'x': arrow(true),
    'y': arrow(false),
    'z': circle(-1, 0, 100),
};

const engineHouse = {
    'building': rect(0, -500, 2000, 1000),
};

const largeEngineHouse = {
    'building': rect(0, -490, 2100, 980),
};

const waterTower = {
    'building': rect(250, 250, 500, -500),
};

export const industrySvgPaths: Partial<Record<IndustryName, Record<string, PathArrayAlias>>> = {
    'logcamp': {
        'platform': combine(
            rect(530, 1440, 300, 1250),
            rect(2570, -1390, 2360 - 2570, 250 + 1390),
        ),
        'building': combine(
            rect(-150, 580, -630, 950),
            rect(3800, -2500, -600, 2100),
            rect(2400, -4690, -980, 1220),
            rect(2140, -3110, -920, 810),
            rect(2400, -2090, -1540, 2370),
            rect(2380, 660, -1370, 870),
            rect(2610, 2250, -1490, 1940),
            rect(-480, -3680, -370, 660),
            rect(-230, -2500, -610, 620),
            rect(-220, -900, -1060, 1000),
            rect(-150, 580, -630, 950),
        ),
    },
    'sawmill': {
        'pond': [
            ['M', 2800, 980],
            ['C', 2010, 640, 1600, 500, 1180, 420],
            ['S', 580, 500, -270, 1100],
            ['S', -800, 1420, -1280, 2270],
            ['S', -1330, 3170, -980, 4170],
            ['S', -320, 4910, 570, 5220],
            ['S', 1250, 5940, 2100, 5840],
            ['S', 2640, 5310, 2750, 4360],
            ['Z'],
        ] as PathCommand[],
        'platform': combine(
            rect(-3900, -4000, 300, 4500),
            rect(2600, 600, 300, 4200),
        ),
        'building': combine(
            polyRect(-1000, -2800,
                900, -2600,
                2600, -1600,
                1050, -200,
                300, 1200,
                -200, -200,
                -1000, -1500,
                -3500, -2200,
                -1000,
            ).concat([['Z']]),
        ),
    },
    'smelter': {
        'platform': combine(
            rect(3400, 600, 300, -4000),
            rect(-3600, 1500, 300, -2050),
            rect(-2900, -1875, 300, -2050),
        ),
        'building': polyRectRel(-550, -4000,
            1500, 1000,
            500, 2575,
            -500, 425,
            -2250, -1700,
            750, -2300),
    },
    'ironworks': {
        'platform': combine(
            rect(-4000, 2800, 2500, -300),
            rect(-200, 2800, 1200, -300),
            rect(-4530, -2780, 1080, -300),
            rect(-2800, -2780, 4500, -300),
        ),
        'building': polyRectRel(3100, 1300,
            -6800, -2600,
            5800, -1000,
            1000),
    },
    'oilfield': {
        'platform': combine(
            rect(-3500, 950, 2300, 300),
            rect(-5500, 950, 1200, 300),
            rect(-1400, -800, 1600, 300),
        ),
        'building': combine(
            circle(1250, 1750, 700),
            circle(-250, 1750, 700),
            rect(-3200, 2400, 2050, 750),
            rotatedRect(-5250, 4400, 750, 2000, 10),
            rotatedRect(1740, 3640, 750, 2000, -5),
            rotatedRect(8860, 4150, 750, 2000, -60),
            rotatedRect(-2500, 7150, 750, 2000, -50),
            rect(-3200, -5700, 2000, 750),
            rect(1600, -3550, 2000, 750),
            rect(-5200, -4400, 750, 2000),
        ),
    },
    'Refinery': {
        'platform': combine(
            rect(1750, -2450, 300, 2200),
            rect(-3050, -700, 300, 2200),
            rect(-2450, 2000, 300, 2200),
            rect(-1900, 4750, 300, 1100),
        ),
        'building': combine(
            circle(-2220, 1180, 600),
            circle(-2260, -90, 600),
            rect(-2620, -2370, 1070, 1420),
            rect(-1510, -3470, 980, 1160),
            rect(500, -3000, 1400, 2500),
            rect(-1350, -500, 1850, 900),
            rect(-1400, 1700, 1800, 900),
        ),
    },
    'coalmine': {
        'platform': combine(
            rect(-250, 2050, 300, -1050),
            rect(-275, -1050, 300, -2050),
        ),
        'building': combine(
            rect(-180, -230, 2320, 790),
            rect(3320, -180, 1080, 760),
        ),
    },
    'ironoremine': {
        'platform': combine(
            rect(-200, 200, 300, -400),
            rect(-200, 4600, 300, -3000),
        ),
        'building': combine(
            rotatedRect(650, -1670, 500, 750, 43),
            polyRect(0, -500,
                500, -150,
                2200, 350,
                500, 1500),
        ),
    },
    'freightdepot': {
        'platform': polyRect(2200, -1000,
            -3300, -700,
            -2300, 1000),
        'building': rectAbs(2100, -900, -2200, 900),
    },
    'firewooddepot': {
        'building': rect(150, 1000, 950, -1700),
    },
    'enginehouse_alpine': engineHouse,
    'enginehouse_aspen': engineHouse,
    'enginehouse_barn': engineHouse,
    'enginehouse_princess': engineHouse,
    'coaltower': {
        'building': rect(50, -900, 600, 600),
    },
    'telegraphoffice': {
        'building': rect(-200, -150, 400, 300),
    },
    'watertower_1870_style1': waterTower,
    'watertower_1870_style2': waterTower,
    'watertower_1870_style3': waterTower,
    'watertower_1870_style4': waterTower,
    'watertower_drgw': waterTower,
    'watertower_kanaskat_style1': waterTower,
    'watertower_kanaskat_style2': waterTower,
    'watertower_kanaskat_style3': waterTower,
    'watertower_kanaskat_style4': waterTower,
    'watertower_small': waterTower,
    'WaterWell': waterTower,
    'engineshed_style1': largeEngineHouse,
    'engineshed_style2': largeEngineHouse,
    'engineshed_style3': largeEngineHouse,
    'engineshed_style4': largeEngineHouse,
    'Woodrick': {
        'building': rect(-130, -65, 260, 130),
    },
};
