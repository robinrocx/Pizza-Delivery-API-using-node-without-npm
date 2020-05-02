/**
 * Library for storing and rotating logs
 */

const fs = require('fs');
const path = require("path");
const zlib = require("zlib");

const lib = {
    baseDir : path.join(__dirname, "/../.logs/"),
    //Append a string to a file, create the file if it doesnt exist
    append : (fileName, logString, callback)=>{
        fs.open(lib.baseDir+fileName+".log", "a", (err, fileDescriptor)=>{
            if(!err && fileDescriptor){
                fs.appendFile(fileDescriptor, logString+'\n', (err)=>{
                    if(!err){
                        fs.close(fileDescriptor, (err)=>{
                            if(!err){
                                callback(false);
                            }
                            else{
                                callback("Error closing file that was being appended");
                            }
                        })
                    }else{
                        callback("Error appending to file.")
                    }
                })
            }else{
                callback("Coould not open file for appending.");
            }
        })
    },

    //List all the logs and optionally include the compress logs
    list : (includeCompressedLogs, callback)=>{
        fs.readdir(lib.baseDir, (err, data)=>{
            if(!err && data && data.length){
                const trimmedFileNames = [];
                data.forEach((fileName)=>{
                    if(fileName.indexOf(".log")> -1){
                        trimmedFileNames.push(fileName.replace(".log",""));
                    }

                    if(fileName.indexOf(".gz")>-1 && includeCompressedLogs){
                        trimmedFileNames.push(fileName.replace(".gz.b64", ""));
                    }
                });
                callback(false, trimmedFileNames);
            }else{
                callback(err, data);
            }
        })
    },

    //Compress the contents of a logFile and save it in a .gzb64 file in the same a directory
    compress : (logId, newFileId, callback)=>{
        const sourceFile = logId + ".log";
        const destFile = newFileId + ".gzb64";

        fs.readFile(lib.baseDir+sourceFile, "utf8", (err, inputString)=>{
            if(!err && inputString){
                zlib.gzip(inputString, (err, buffer)=>{
                    if(!err && buffer){
                        fs.open(lib.baseDir+destFile, "wx", (err, fileDescriptor)=>{
                            if(!err && fileDescriptor){
                                fs.writeFile(fileDescriptor, buffer.toString('base64'), (err)=>{
                                    if(!err){
                                        fs.close(fileDescriptor, (err)=>{
                                            if(!err){
                                                callback(false);
                                            }else{
                                                callback(err);
                                            }
                                        })
                                    }else{
                                        callback(err);
                                    }
                                })
                            }else{
                                callback(err);
                            }
                        })
                    }else{
                        callback(err);
                    }
                })
            }else{
                callback(err);
            }
        })
    },

    //Decompress the compressed files
    decompress : (fileId, callback)=>{
        const fileName = fileId + ".gz.b64";
        fs.readFile(lib.baseDir+fileName, "utf8", (err, inputString)=>{
            if(!err && inputString){
                const inputBuffer = Buffer.from(inputString, "base64");
                zlib.unzip(inputBuffer, (err, outputBuffer)=>{
                    if(!err && outputBuffer){
                        const outputString = outputBuffer.toString();
                        callback(false, outputString);
                    }else{
                        callback(err);
                    }
                })
            }else{
                callback(err);
            }
        })
    },

    //Truncating a log file
    truncate : (logId, callback)=>{
        fs.truncate(lib.baseDir+logId+".log",0, (err)=>{
            if(!err){
                callback(false);
            }else{
                callback(err);
            }
        })
    }
};

module.exports = lib;