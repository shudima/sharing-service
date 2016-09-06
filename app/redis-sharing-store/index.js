var redis = require('redis');
var redisStreams = require('redis-streams');
var RedisSharingStore = require('./redis-sharing-store.js');
redisStreams(redis);

function createRedisSharingStore(config) {
	return new Promise((resolve, reject) => {
			var redisStreamsClient = redis.createClient(config.redisPort, 
									 config.redisHost, 
									 { return_buffers : true });

			redisStreamsClient.on('connect', _ => resolve(new RedisSharingStore(redisStreamsClient)));
			redisStreamsClient.on('error',  (error) => reject({ message : 'Error connecting to Redis.', error : error}));	
	});
}

module.exports = createRedisSharingStore;