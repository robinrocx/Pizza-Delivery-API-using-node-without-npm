/**
 * The library responsible for all the crud operations in the app
 */

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data');

//Method used to create new documents
lib.create=(dir, fileName, data, callback)=>{
    fs.open(`${lib.baseDir}/${dir}/${fileName}.json`,'wx', (error, fileDescriptor)=>{
        if(!error && fileDescriptor){
            const stringData = JSON.stringify(data);
            fs.write(fileDescriptor, stringData, (error)=>{
                if(!error){
                    fs.close(fileDescriptor, (error)=>{
                        if(!error){
                            callback(false);
                        } else{
                            callback("Error closing the file");
                        }
                    })
                } else{
                    callback("Error writing to the file");
                }
            });
        } else{
            callback("Could not create the file. It may already exist");
        }
    });
};

//Method used to read data
lib.read=(dir, fileName, callback)=>{
    fs.readFile(`${lib.baseDir}/${dir}/${fileName}.json`,'utf-8', (error, data)=>{
        if(error){
            callback(error);
        } else{
            callback(error, helpers.getJsonParsedToObject(data));
        }
    })
};

//Method used to read data
lib.update=(dir, fileName, data, callback)=>{
    fs.open(`${lib.baseDir}/${dir}/${fileName}.json`, 'r+',(error, fileDescriptor)=>{
        if(!error && fileDescriptor){
            const stringData = JSON.stringify(data);
            fs.truncate(fileDescriptor, (error)=>{
                if(!error){
                    fs.writeFile(fileDescriptor,stringData, (error)=>{
                        if(!error){
                            fs.close(fileDescriptor,(error)=>{
                                if(!error){
                                    callback(false);
                                } else{
                                    callback("Error closing the file.");
                                }
                            })
                        } else{
                            callback("Error writing to the file.");
                        }
                    })
                } else{
                    callback("Error truncating the file.");
                }
            })
        } else{
            callback("Could not open the file for updating. It may not exist.");
        }
    })
};

//Method used to read data
lib.delete=(dir, fileName, callback)=>{
    fs.unlink(`${lib.baseDir}/${dir}/${fileName}.json`,(error)=>{
        if(!error){
            callback(false);
        } else{
            callback("Error deleting the file.")
        }
    })
};

//Method to list all the records
lib.list=(dir, callback)=>{
    fs.readdir(`${lib.baseDir}/${dir}`, (error, data)=>{
        if(!error && data && data.length>0){
            const trimmedFileNames = data.slice(1, data.length).map(fileName=>fileName.replace(".json", ""));
            callback(false, trimmedFileNames);
        }else{
            callback(error, data);
        }
    })
}

module.exports=lib;