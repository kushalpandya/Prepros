/**
 * Prepros
 * (c) Subash Pathak
 * sbshpthk@gmail.com
 * License: MIT
 */


/*jshint browser: true, node: true*/
/*global prepros*/

prepros.factory('sass', function (config, utils, notification) {

    'use strict';

    var fs = require('fs-extra'),
        path = require('path'),
        cp = require('child_process'),
        _id = utils.id;


    var format = function (filePath, projectPath) {

        //File name
        var name = path.basename(filePath);

        //Relative input path
        var shortInput = path.relative(projectPath, filePath).replace(/\\/g, '/');

        // Output path
        var output = filePath.replace(/\.sass|\.scss/gi, '.css');

        var pathRegx = /\\sass\\|\\scss\\|\/sass\/|\/scss\//gi;

        //Find output path; save to user defined css folder if file is in sass or scss folder
        if(filePath.match(pathRegx)) {

            output = path.normalize(output.replace(pathRegx, path.sep + '{{cssPath}}' + path.sep));

        }

        //Find short output path
        var shortOutput = output.replace(/\\/g, '/');

        //Show Relative path if output file is within project folder
        if (path.relative(projectPath, filePath).indexOf('.' + path.sep) === -1) {

            shortOutput = path.relative(projectPath, output).replace(/\\/g, '/');
        }

        var file = {
            id: _id(filePath),
            pid: _id(projectPath),
            name: name,
            input: filePath,
            shortInput: shortInput,
            output: output,
            shortOutput: shortOutput,
            config : config.getUserOptions().sass
        };

        var ext = path.extname(filePath);

        if (ext === '.scss') {

            file.type = 'Scss';

        } else if (ext === '.sass') {

            file.type = 'Sass';
        }

        return file;

    };


    //Compile

    var compile = function (file, successCall, errorCall) {

        var args =[];

        if(file.config.fullCompass && file.config.compass) {

            args = [config.ruby.gems.compass.path];

            args.push('compile', path.relative(file.projectPath, file.input).replace(/\\/gi, '/'));

            args.push("--environment", 'development');

            //Output Style
            args.push('--output-style', file.config.outputStyle);

            //Line numbers
            if (!file.config.lineNumbers) {
                args.push('--no-line-comments');
            }

            //Debug info
            if(file.config.debug){

                args.push('--debug-info');
            }

            args.push('--force');

        } else {

            args = [config.ruby.gems.sass.path];

            //Force utf-8 encoding
            args.push('-E', 'utf-8');

            if(file.config.unixNewlines) {

                args.push('--unix-newlines');
            }

            //Input and output
            args.push(file.input, file.output);

            //Load path for @imports
            args.push('--load-path', path.dirname(file.input));

            //Convert backslashes to double backslashes which weirdly escapes single quotes from sass cache path fix #52
            var cacheLocation = config.cachePath.replace(/\\\\/gi, '\\\\');

            //Cache location
            args.push('--cache-location', cacheLocation);

            //Output Style
            args.push('--style', file.config.outputStyle);

            //Debug info
            if(file.config.debug){

                args.push('--debug');
            }

            //Compass
            if (file.config.compass) {

                args.push('--compass');
            }

            //Sass bourbon
            args.push('--load-path', config.ruby.gems.bourbon.path);

            //Line numbers
            if (file.config.lineNumbers) {
                args.push('--line-numbers');
            }

            //Make output dir if it doesn't exist
            fs.mkdirsSync(path.dirname(file.output));

        }

        var rubyProcess;

        if(config.getUserOptions().useCustomRuby) {

            try {

                if(fs.existsSync(config.getUserOptions().customRubyPath)) {

                    //Start a child process to compile the file; file.projectPath is provided by compiler.js file
                    rubyProcess = cp.spawn(config.getUserOptions().customRubyPath, args, {cwd: file.projectPath});

                } else {


                    notification.error('Invalid Ruby Path', 'Prepros was unable to run Ruby', config.getUserOptions().customRubyPath + ' not found');

                }

            } catch(e) {

                notification.error('Invalid Custom Path', 'Prepros was unable to run custom executable.', e.message);
            }

        } else {

            //Start a child process to compile the file; file.projectPath is provided by compiler.js file
            rubyProcess = cp.spawn(config.ruby.path, args, {cwd: file.projectPath});

        }

        var compileErr = false;

        //If there is a compilation error
        rubyProcess.stderr.on('data', function (data) {

            compileErr = true;

            errorCall(data.toString());

        });

        //Success if there is no error
        rubyProcess.on('exit', function(){
            if(!compileErr){

                successCall(file.input);

            }

            rubyProcess = null;
        });

    };

    return {
        format: format,
        compile: compile
    };
});