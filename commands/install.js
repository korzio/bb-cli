'use strict';

var Command = require('ronin').Command;
var chalk = require('chalk');
var spawn = require('cross-spawn');
var path = require('path');
var GenerateRequireConf = require('../lib/generateRequireConf');
var restUtils = require('../lib/restUtils');
var depUtils = require('../lib/depUtils');
var configLib = require('../lib/config');
var q = require('q');

var baseUrl = process.cwd();

var config = {
    customArgs: [
        '--catalog','-C',
        '--web-url',
        '--require-confs'
    ]
};

var applyBBJSONconfChanges = function(bowerRc, argOptions){
    if (argOptions['web-url']) bowerRc.dependenciesWebUrl = argOptions['web-url'];
    if (argOptions['require-confs']) bowerRc.requirejsConfigs = argOptions['require-confs'].split(',');

    return bowerRc;
};

var install = function(componentEndpoint){
    var that = this;

    // Get bower.json and .bowerrc
    q.all([
        configLib.getBower(),
        configLib.getBowerRc(),
        configLib.getBb()
    ]).spread(function (bowerJSON, bowerRc, bbJSON) {
        var bowerCommand = ['install'];
        var cmdArgs = process.argv;
        var argCatalog = cmdArgs.indexOf('--catalog') > -1 || cmdArgs.indexOf('-C') > -1;
        var msg = 'Bower install done, proceed to RequireJS conf generation...';

        // Adding default directory field
        if (!bowerRc.directory) bowerRc.directory = path.join(baseUrl, 'bower_components');

        // Applying arguments overrides
        bbJSON = applyBBJSONconfChanges(bbJSON, that.options);

        // If installing component by name
        if (componentEndpoint){

            // If we install local component, we need to first delete previous one
            if (componentEndpoint.substring(0, 2) === './' || componentEndpoint[0] === '/') {
                depUtils.cleanLocalComponent(path.join(baseUrl, bowerRc.directory), componentEndpoint);
            }

            msg = 'Component "'+ componentEndpoint +'" install done, proceed to RequireJS conf generation...';
        }

        // Pass all arguments to bower
        if (cmdArgs){
            cmdArgs.forEach(function(arg){
                // Except internal ones
                if (config.customArgs.indexOf(arg) === -1) bowerCommand.push(arg);
            });
        }

        console.log(chalk.gray('Running Bower install...'));

        // First, we install all bower deps
        spawn('bower', bowerCommand, {stdio: 'inherit'}).on('close', function () {
            var generateRJSConf = new GenerateRequireConf(baseUrl, bowerJSON, bowerRc, bbJSON);

            console.log(chalk.gray(msg));

            // Then we generate RequireJS conf
            generateRJSConf.process().then(function(confs){
                // And submit if specified arguments are set
                var componentPath;

                if (componentEndpoint) {
                    var componentName = depUtils.getComponentNameFromMeta(componentEndpoint, confs.pkgMeta);

                    componentPath = path.join(baseUrl, confs.customComponents[componentName]);
                }

                if (argCatalog) restUtils.submitToPortal(baseUrl, confs.customComponents, false, componentPath);
            }).fail(function(err){
                console.log(chalk.red('Something went wrong during requirejs configuration generation: '), err);
            });
        });
    }).fail(function(err){
        console.log(chalk.red('Something went wrong, during Bower configuration read: '), err);
    });
};

var Install = Command.extend({
    desc: 'Bower wrapper with post generation of requirejs',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t bb ' + this.name + ' <endpoint> [<endpoint> ..] [OPTIONS]';
        r += '\n\n\t Installs all or specified bower dependencies, generates RequireJS configuration and uploads component model to portal.';
        r += '\n\n\t Some args could be set through bb.json like `"requirejsConfigs":[]` and `"dependenciesWebUrl":""`.';
        r += '\n\t Also accepts `bower install` arguments like --save, -save-dev, --production, check `bower install -h`';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -C,  --catalog <boolean>\t\t' + d('false') + '\t\t\t\tUpload components to CXP via REST after install.\n';
        r += '           --web-url <string>\t\t' + d('same/as/bower_components') + '\tWeb path to bower components directory.\n';
        r += '           --require-confs <string>\t\t\t' + '\t\tComa seperated list of relative paths to existing require configuration.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb install\t\t\tInstalls all Bower dependencies and runs requirejs conf generation.\n';
        r += '      bb install jquery\t\t\tInstalls jquery component and runs rjs-conf generation.\n';
        r += '      bb install widget-feed -C\t\tInstalls widget, generates rjs-conf and uploads it to CXP via REST.\n';
        r += '\n';
        return r;
    },

    run: install
});

module.exports = Install;