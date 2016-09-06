
var uuid = require('uuid');
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var defaultPassword = 'd6F3Efeq';

function RedisSharingStore(redisStreamsClient) {
	this.redisStreamsClient = redisStreamsClient;
}

RedisSharingStore.prototype.writeStream = function(stream, filename ,userPassword) {
	var that = this;

	try {
		
		var fileMeta = { filename : filename, passwordRequired : !!userPassword };
		if(!userPassword) userPassword = defaultPassword;

		var key = uuid.v1();
		var encrypt = crypto.createCipher(algorithm, userPassword);
		return new Promise((resolve,reject) => {
			stream
				.pipe(encrypt)
				.pipe(that.redisStreamsClient.writeStream(key))
			  	.on('finish', _ => {
			  		that.redisStreamsClient.set(key + ':metadata', JSON.stringify(fileMeta));
			  		that.redisStreamsClient.expire(key, 60*60*24 /* One day */);
			  		that.redisStreamsClient.expire(key + ':metadata', 60*60*24 /* One day */);
			  		resolve(key);
			  	});				
		});
	} catch (e) {
		return Promise.reject(e);
	}
}

RedisSharingStore.prototype.getFileMetadata = function(key) {
	var that = this;

	return new Promise((resolve,reject) => {
		that.redisStreamsClient.get(key + ':metadata', (error, result) => {
			try {
				if(error) {
					reject(error);
				} else if(!result) {
					reject({ message : 'No result found for key ' + key });
				} else {
					resolve(JSON.parse(result));
				}
			} catch(e) {
				reject(e);
			}
		});
	});
}


RedisSharingStore.prototype.getFile = function(key, userPassword) {
	var that = this;

	if(!userPassword) userPassword = defaultPassword;
	var decipher = crypto.createDecipher(algorithm,userPassword);
	
	return new Promise((resolve,reject) => {
		that.redisStreamsClient.get(key, (error, result) => {
			try {
				if(error) {
					reject(error);
				} else if(!result) {
					reject({ message : 'No result found for key ' + key });
				} else {
					var decrypted = Buffer.concat([decipher.update(result) , decipher.final()]);
					resolve(decrypted);
				}
			} catch(e) {
				reject(e)
			}
		});
	});
}


RedisSharingStore.prototype.get = function(key, userPassword) {
	var that = this;
	return that.getFileMetadata(key)
			   .then(metadata => {
			   		if(metadata.passwordRequired && !userPassword) {
			   			return Promise.resolve({ error : 'Password Required'});
			   		} else {
			   			return that.getFile(key, userPassword)
			   			           .then(file => Promise.resolve({ file:file, metadata : metadata }));
			   		}
			   });
}

module.exports = RedisSharingStore;