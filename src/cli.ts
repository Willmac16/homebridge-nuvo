#!/usr/bin/env node
import {
    NuvoSerial
} from "./serial";
import readline from 'readline';

const MAX_ZONES = 20;
const MAX_SOURCES = 6;
const MAX_GAIN = 14;
const MAX_EIGHTTEEN = 18;

import { addColors, createLogger, format, transports } from 'winston';

const customLevels = {
levels: {
    error: 0,
    warn: 1,
    info: 2,
    nuvo: 3,
    verbose: 4,
    debug: 5,
    silly: 6
},
colors: {
    error: 'red',
    warn: 'orange',
    info: 'green',
    nuvo: 'blue',
    verbose: 'yellow',
    debug: 'grey',
    silly: 'black'
}

};

const logger = createLogger({
    levels: customLevels.levels,
    level: 'nuvo',
    format: format.combine(
        format.colorize({all: true}),
        format.printf(info => {
            const {
                level, message, ...args
            } = info;

            return `${Object.keys(args).length ? JSON.stringify(args, null, 2) : message}`;
        }),
    ),
    transports: [
        new transports.Console()
    ]
});

addColors(customLevels.colors);

var serialConnection: NuvoSerial;
var serial = require("./serial");

var port = '/dev/tty.usbserial';
var numZones = 8;

var rl: readline.Interface;

function printShellHelp(): void {
    logger.info("Usage:");
    logger.info("  nuvo-config <path_to_serial_port>")
}

function printCommandHelp(cmd?: string): void {
    if (cmd)
        logger.info(`\`${cmd}\` was not called with the correct arguments\n`);
    logger.info("Nuvo Config runs in:");
    logger.info("    Sentence Mode: string together commands to quickly change setup");
    logger.info("        ex. `zone 4 enable name \"Best Zone\"` - enables and renames zone 4");
    logger.info("        ex. `source 3 disable` - disables source 3\n");

    logger.info("    `help` - print this help text");
    logger.info("    `exit` - exit nuvo-config\n");
    logger.info("Available Commands:");
    logger.info("    `source <source_number>` - set the source that config actions will apply to\n            (1-20) (0 to apply to all)");
    logger.info("    `zone <zone_number>` - set the zone that config actions will apply to\n            (1-6) (0 to apply to all)");
    logger.info("    `status` - get the current config status of the zone or source");
    logger.info("    `enable` - enable the selected zone or source");
    logger.info("    `disable` - disable the selected zone or source");
    logger.info("    `name <new_name>` - set the name of a selected zone or soure\n");

    logger.info("    `shortname <three_letter_name>` - set the three letter shortname for a source");
    logger.info("    `gain <gain_value>` - set the gain value for a source (0 - 14)\n");

    logger.info("    `eq` - get the current eq config for a zone");
    logger.info("    `bass <bass_value>` - set the bass value for a zone (-18 - 18)");
    logger.info("    `treble <treble_value>` - set the treble value for a zone (-18 - 18)");
    logger.info("    `balance <balance_value>` - set the left/right balance value for a zone (-18 - 18)");
    logger.info("    `loudcomp (enable | disable)` - enable/disable loudness compensation");


}

function argSplitString(data: string): string[] {
    let singleQCount = false;
    let doubleQCount = false;
    let escapeNext = false;

    let args = [];
    let currentArg = "";


    for (var c of data) {
        if (escapeNext) {
            currentArg += c;
            escapeNext = false;
        } else if (c === '\"') {
            doubleQCount = !doubleQCount;
        } else if (c === '\'') {
            singleQCount = !singleQCount;
        } else if (c === "\\") {
            escapeNext = true;
        } else if (c === ' ' && !singleQCount && !doubleQCount) {
            args.push(currentArg);
            currentArg = "";
        } else {
            currentArg += c;
        }
    }
    args.push(currentArg);
    currentArg = "";

    return args;
}

var args: string[] = process.argv.slice(2);


// logger.info("\nPort:", port, "NumZones:", numZones);

class CLIPlatform
{
    cli: number;
    outstandingCmds: number;

    constructor() {
        this.cli = 1;
        this.outstandingCmds = 0;
    }

    prompt () {
        rl.prompt();
    }

    onPortOpen() {
        launchConsole();
    }
}

function checkZoneCommand(zone: number, callback: any) {
    if (zone === -1) {
        logger.info("Please specify a valid zone");
        cli.prompt();
    } else if (zone === 0) {
        for (let z=1; z<=MAX_ZONES; z++) {
            cli.outstandingCmds++;
            callback(z);
        }
    } else {
        cli.outstandingCmds++;
        callback(zone);
    }
}

function checkSourceCommand(source: number, callback: any) {
    if (source === -1) {
        logger.info("Please specify a valid source");
        cli.prompt();
    } else if (source === 0) {
        for (let s=1; s<=MAX_SOURCES; s++) {
            cli.outstandingCmds++;
            callback(s);
        }
    } else {
        cli.outstandingCmds++;
        callback(source);
    }
}

var cmdQueue = [];

function hasNext() {
    return cmdQueue.length > 0;
}


function getNext(word?: string) {
    if (hasNext())
        return cmdQueue.shift();
    else
        logger.info(`Please enter the appropriate arguments for ${word}`);

}

/**
* Min Exclusive, Max Inclusive, number grabbing
*/
function getNumber(min: number, max: number, step: number, word: string) {
    if (hasNext())
    {
        let next = getNext(word);
        let val = parseInt(next);
        if (isNaN(val) || val <= min || val > max) {
            logger.info(`Please enter a valid ${word} number between ${min+1} and ${max}`);
            cmdQueue.unshift(next);
            return min;
        } else {
            if (val % step != 0) {
                val -= val % step;
            }
            return val
        }
    } else {
        return min;
    }
}

function parseConfigLine(line: string):void {
    cmdQueue = argSplitString(line);

    let zone = -1;
    let source = -1;
    let zoneMode = false;

    while (hasNext()) {
        let current: string = getNext();

        // Commands switch
        switch (current) {
            case 'zone':
                zone = getNumber(-1, MAX_ZONES, 1, 'zone');
                zoneMode = true;
                break;
            case 'source':
                source = getNumber(-1, MAX_SOURCES, 1, 'zone');
                zoneMode = false;
                break;
            case 'enable':
                if (zoneMode)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigEnable(zone, 1)});
                else
                    checkSourceCommand(source, (source: number) => {serialConnection.sourceConfigEnable(source, 1)});
                break;
            case 'disable':
                if (zoneMode)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigEnable(zone, 0)});
                else
                    checkSourceCommand(source, (source: number) => {serialConnection.sourceConfigEnable(source, 0)});
                break;
            case 'name':
                let name = getNext('name');

                if (name != null) {
                    if (zoneMode)
                        checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigName(zone, name)});
                    else
                        checkSourceCommand(source, (source: number) => {serialConnection.sourceConfigName(source, name)});
                }
                break;
            case 'shortname':
                let shortname = getNext('shortname');

                if (shortname != null) {
                    checkSourceCommand(source, (source: number) => {serialConnection.sourceConfigShortName(source, shortname)});
                }
                break;
            case 'gain':
                let gain = getNumber(-1, MAX_GAIN, 1, 'gain');
                if (gain != -1)
                    checkSourceCommand(source, (source: number) => {serialConnection.sourceConfigGain(source, gain)});
                break;
            case 'status':
                if (zoneMode)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneAskConfig(zone)});
                else
                    checkSourceCommand(source, (source: number) => {serialConnection.sourceAskConfig(source)});
                break;
            case 'eq':
                checkZoneCommand(zone, (zone: number) => {serialConnection.zoneAskEQ(zone)});
                break;
            case 'bass':
                let bass = getNumber(-MAX_EIGHTTEEN-1, MAX_EIGHTTEEN, 2, 'bass');
                if (bass != -MAX_EIGHTTEEN-1)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigBass(zone, bass)});
                break;
            case 'treble':
                let treble = getNumber(-MAX_EIGHTTEEN-1, MAX_EIGHTTEEN, 2, 'treble');
                if (treble != -MAX_EIGHTTEEN-1)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigTreble(zone, treble)});
                break;
            case 'balance':
                let bal = getNumber(-MAX_EIGHTTEEN-1, MAX_EIGHTTEEN, 2, 'balance');
                if (bal != -MAX_EIGHTTEEN-1)
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigBalance(zone, bal)});
                break;
            case 'loudcomp':
                let lc = getNext('loudcomp');
                if (lc === "enable")
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigLoudComp(zone, 1)});
                else
                    checkZoneCommand(zone, (zone: number) => {serialConnection.zoneConfigLoudComp(zone, 0)});
                break;
            default:
                logger.info(`\`${current}\` is not a registered nuvo-config command`);
                printCommandHelp();
                cli.prompt();
        }
    }
}


function launchConsole():void {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'Nuvo-Config> '
    });
    rl.prompt();

    rl.on('line', (line: string) => {
        switch (line.trim()) {
            case 'help':
                printCommandHelp();
                cli.prompt();
                break;
            default:
                parseConfigLine(line);
                break;
            case 'exit':
            case 'quit':
                console.info('Bye!');
                process.exit(0);
        }
    }).on('close', () => {
        logger.info('Bye!');
        process.exit(0);
    });
}

if (args.length > 0) {
    port = args.shift();

    var cli: CLIPlatform = new CLIPlatform();
    logger.info("Beginning serial connection");
    serialConnection = new serial.NuvoSerial(logger, port, numZones, 0, cli);
} else {
    printShellHelp();
}
