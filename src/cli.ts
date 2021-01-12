#!/usr/bin/env node
import {
    NuvoSerial
} from "./serial";
import readline from 'readline';

const MAX_ZONES = 20;

var serialConnection: NuvoSerial;
var serial = require("./serial");

var port = '/dev/tty.usbserial';
var numZones = 8;

var options = ['{-p|--port} <path_to_serial_port>', '{-h|--help}'];

var rl: readline.Interface;

function printShellHelp(): void {
    console.log("\nUsage:");
    console.log("  nuvo-config <command> <arguments_for_command>")
    console.log("  nuvo-config <command> <arguments_for_command> [<options>]\n")
    // console.log("<command> can be one of:")
    // for (var command of commands) {
    //     console.log(`    ${command}`)
    // }
    console.log("\n<options> can be one of:");
    for (var option of options) {
        console.log(`    ${option}`)
    }
}

function printCommandHelp(cmd?: string): void {
    if (cmd)
        console.log(`\`${cmd}\` was not called with the correct arguments\n`);
    console.log("Nuvo Config runs in:");
    console.log("    Sentence Mode: string together commands to quickly change setup")
    console.log("        ex. `zone 4 enable name \"Best Zone\"` - enables and renames zone 4")
    console.log("        ex. `source 3 disable` - disables source 3\n")
    // console.log("    Wizard Mode: walks you through the setup process")
    // console.log("        ex. `zone 4 wizard` - launches the wizard for zone 4")
    // console.log("        ex. `wizard` - launches the wizard for all zones and sources\n")
    console.log("Available Commands:")
    console.log("    `source <source_number>` - set the source that config actions will apply to")
    console.log("    `zone <zone_number>` - set the zone that config actions will apply to")
    console.log("    `status` - get the current config status of the zone or source")
    console.log("    `enable` - enable the selected zone or source")
    console.log("    `disable` - disable the selected zone or source")
    console.log("    `name <new_name>` - set the name of a selected zone or soure")
    console.log("    `shortname <three_letter_name>` - set the three letter shortname for a source")
    console.log("    `gain <gain_value>` - set the gain value for a source (0-14)")
}

function argSplitString(data: string): string[] {
    let singleQCount = false;
    let doubleQCount = false;
    let escapeNext = false;

    let args = [];
    let currentArg = "";


    for (var c of data) {
        if (escapeNext)
            currentArg += c;
        else if (c == '\"')
            doubleQCount = !doubleQCount;
        else if (c == '\'')
            singleQCount = !singleQCount;
        else if (c == "\\")
            escapeNext = true;
        else if (c == ' ' && !singleQCount && !doubleQCount) {
            args.push(currentArg);
            currentArg = "";
        }
        else
            currentArg += c;
    }
    args.push(currentArg);
    currentArg = "";

    return args;
}

var args: string[] = process.argv.slice(2);

while (args.length > 0) {
    let current: string = args.shift();

    if (args.length > 0 && current.substring(0, 1) === "-")
    {
        // Options switch
        switch (current) {
            case '-p':
            case '--port':
                port = args.shift();
                break;
            case '-h':
            case '--help':
            default:
                console.log(current, "is not a registered nuvo-config option");
                args.shift();
                printShellHelp();
        }
    }
}

// console.log("\nPort:", port, "NumZones:", numZones);

class CLIPlatform
{
    cli: number;

    constructor() {
        this.cli = 1;
    }

    prompt() {
        rl.prompt();
    }

    onPortOpen() {
        launchConsole();
    }
}

function checkZoneCommand(zone: number, callback) {
    if (zone != -1)
        callback(zone);
    else
        console.log("Please specify a valid zone");
}

function checkSourceCommand(source: number, callback) {
    if (source != -1)
        callback(source);
    else
        console.log("Please specify a valid source");
}

function parseConfigLine(line: string):void {
    let cmdQueue = argSplitString(line);

    let zone = -1;
    let source = -1;
    let zoneMode = false;

    while (cmdQueue.length > 0) {
        let current: string = cmdQueue.shift();

        // Commands switch
        switch (current) {
            case 'zone':
                if (cmdQueue.length > 0) {
                    let val = parseInt(cmdQueue.shift());
                    if (isNaN(val) || val <= 0 || val > MAX_ZONES)
                        console.log("Please enter a valid zone number after the word zone");
                    else
                        zone = val;
                        zoneMode = true;
                } else {
                    console.log(`\`${current}\` was not called with the correct arguments`);
                    printCommandHelp();
                }
                break;
            case 'source':
                if (cmdQueue.length > 0) {
                    let val = parseInt(cmdQueue.shift());

                    if (isNaN(val))
                        console.log("Please enter a valid source number after the word source");
                    else
                        source = val
                        zoneMode = false;
                } else {
                    printCommandHelp(current);
                }
                break;
            case 'enable':
                if (zoneMode)
                    checkZoneCommand(zone, (zone) => {serialConnection.zoneConfigEnable(zone, 1)});
                else
                    checkSourceCommand(source, (source) => {serialConnection.sourceConfigEnable(source, 1)});
                break;
            case 'disable':
                if (zoneMode)
                    checkZoneCommand(zone, (zone) => {serialConnection.zoneConfigEnable(zone, 0)});
                else
                    checkSourceCommand(source, (source) => {serialConnection.sourceConfigEnable(source, 0)});
                break;
            case 'name':
                if (cmdQueue.length > 0)
                {
                    let name = cmdQueue.shift();

                    if (zoneMode)
                        checkZoneCommand(zone, (zone) => {serialConnection.zoneConfigName(zone, name)});
                    else
                        checkSourceCommand(source, (source) => {serialConnection.sourceConfigName(source, name)});
                }
                else
                {
                    printCommandHelp(current);
                }
                break;
            case 'shortname':
                if (cmdQueue.length > 0)
                {
                    let name = cmdQueue.shift();

                    checkSourceCommand(source, (source) => {serialConnection.sourceConfigShortName(source, name)});
                }
                else
                {
                    printCommandHelp(current);
                }
                break;
            case 'gain':
                if (cmdQueue.length > 0)
                {
                    let val = parseInt(cmdQueue.shift());

                    if (isNaN(val))
                        console.log("Please enter a valid gain value after the word gain");
                    else
                        checkSourceCommand(source, (source) => {serialConnection.sourceConfigGain(source, val)});
                }
                else
                {
                    printCommandHelp(current);
                }
                break;
            case 'status':
                if (zoneMode)
                    checkZoneCommand(zone, (zone) => {serialConnection.zoneAskConfig(zone)});
                else
                    checkSourceCommand(source, (source) => {serialConnection.sourceAskConfig(source)});
                break;
            default:
                console.log(`\`${current}\` is not a registered nuvo-config command`);

            printCommandHelp();
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
            case 'hello':
                console.log('world!');
                break;
            case 'help':
                printCommandHelp();
                break;
            default:
                parseConfigLine(line);
                break;
            case 'exit':
            case 'quit':
                console.log('Bye!');
                process.exit(0);
        }
        rl.prompt();
    }).on('close', () => {
        console.log('Bye!');
        process.exit(0);
    });
}


let cli: CLIPlatform = new CLIPlatform();

serialConnection = new serial.NuvoSerial(console, port, numZones, 0, cli);

// launchConsole();
