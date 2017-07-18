"use strict";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    let extensionAPI = new ExtensionAPI();
    context.subscriptions.push(extensionAPI);
    context.subscriptions.push(new ExtensionAPIController(extensionAPI));
}

class ExtensionAPIController {
    private extensionAPI: ExtensionAPI;
    private disposable: vscode.Disposable;
    private lastLine: number = undefined;

    constructor(extensionAPI: ExtensionAPI){
        this.extensionAPI = extensionAPI;

        let subscriptions: vscode.Disposable[] = [];
        subscriptions.push(vscode.commands.registerCommand(
            "extension-api.pickExpression", () => {
                this.extensionAPI.pickExpression();
            }
        ));
        subscriptions.push(vscode.commands.registerCommand(
            "extension-api.evaluate", () => {
                this.extensionAPI.evaluate();
            }
        ));
        vscode.workspace.onDidChangeConfiguration(() => {
            this.extensionAPI.updateConfigurations();
        }, this, subscriptions);

        this.disposable = vscode.Disposable.from(...subscriptions);
    }

    dispose(){
        this.disposable.dispose();
    }
}

interface ActionItem extends vscode.MessageItem {
    identifier: string;
}

class ExtensionAPI {
    outputChanel: vscode.OutputChannel;
    statusItem: vscode.StatusBarItem;
    includePrototype = false;
    includePrivate = true;

    constructor(){
        this.statusItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right
        );
        this.statusItem.command = "extension-api.pickExpression";
        this.statusItem.text = "$(plug)";
        this.statusItem.tooltip = "Pick Visual Studio Code's Extension API";
        this.updateConfigurations();
    }

    dispose(){
        this.outputChanel.dispose();
        this.statusItem.dispose();
    }

    updateConfigurations(){
        let configurations = vscode.workspace.getConfiguration("extension-api");
        this.includePrototype = configurations.get<boolean>("includePrototype");
        this.includePrivate = configurations.get<boolean>("includePrivate");
        if(configurations.get<boolean>("showAPIShortcut")){
            this.statusItem.show();
        }else{
            this.statusItem.hide();
        }
    }

    getType(object: any): string {
        if(typeof(object) === "object" && Array.isArray(object)){
            return `object:array(${object.length})`;
        }
        return typeof(object);
    }

    pickExpression(object: any = vscode, name: string = "vscode"){
        let components = name.split(".");
        let items = Object.getOwnPropertyNames(object).concat(
            Object.getOwnPropertyNames(Object.getPrototypeOf(object)
        )).filter(value => {
            if(value.startsWith("__")){
                return this.includePrototype;
            }
            if(value.startsWith("_")){
                return this.includePrivate;
            }
            return true;
        }).map(value => {
            let isArray = Array.isArray(object) && value.match("\\d+");
            return {
                label: (
                    isArray ?
                    `${components[components.length - 1]}[${value}]` :
                    value
                ),
                description: this.getType(object[value]),
                identifier: (
                    isArray ? `[${value}]` : `.${value}`
                ),
                value: object[value]
            };
        });
        vscode.window.showQuickPick(
            [{
                label: "this",
                description: components[components.length - 1],
                identifier: "",
                value: object
            }].concat(
                items.filter(item => {
                    return item.description !== "undefined";
                }).sort((a, b) => {
                    let compare = 0;
                    if(
                        a.description === "function" &&
                        b.description === "function"
                    ){
                        compare = 0;
                    }else if(a.description === "function"){
                        return -1;
                    }else if(b.description === "function"){
                        return 1;
                    }
                    if(compare === 0){
                        compare = a.label.localeCompare(b.label);
                    }
                    return compare;
                })
            ), {
                placeHolder: name
            }
        ).then(item => {
            if(!item){
                return;
            }
            if(
                item.description.split(":")[0] === "object" &&
                item.identifier !== ""
            ){
                this.pickExpression(item.value, `${name}${item.identifier}`);
            }else{
                this.evaluate(`${name}${item.identifier}`);
            }
        });
    }

    evaluate(value: string = "vscode.window.activeTextEditor"){
        vscode.window.showInputBox({
            placeHolder: "Insert Visual Studio Code's API Call Here...",
            value: value,
            prompt: "Visual Studio Code's API Calls"
        }).then(value => {
            if(!value){
                return;
            }
            this.evaluateExpression(value);
        })
    }

    evaluateExpression(expression: string){
        if(!this.outputChanel){
            this.outputChanel = vscode.window.createOutputChannel(
                "Extension API"
            );
        }
        this.outputChanel.clear();
        let output: string = undefined;
        let error: string = undefined;
        try {
            let returnObject = eval(expression);
            if(typeof(returnObject) === "object"){
                output = JSON.stringify(returnObject);
            }else if(returnObject === undefined || returnObject === null){
                output = typeof(returnObject);
            }else{
                output = `${returnObject}`;
            }
            this.outputChanel.appendLine(`Expression: ${expression}`);
            this.outputChanel.appendLine(`Output: ${output}`);
        } catch(err) {
            error = `Error: ${err}`;
        }

        let actionHandler = item => {
            if(!item){
                return;
            }
            if(item.identifier === "reevaluate"){
                this.evaluateExpression(expression);
            }else if(item.identifier === "show"){
                this.outputChanel.show();
            }
        };

        if(error){
            vscode.window.showErrorMessage(output, {
                title: "Show Full Output",
                identifier: "show"
            }).then(actionHandler);
        }else{
            vscode.window.showInformationMessage(
                output, {
                    title: "Re-Evaluate",
                    identifier: "reevaluate"
                }, {
                    title: "Show Full Output",
                    identifier: "show"
                }
            ).then(actionHandler);
        }
    }
}
