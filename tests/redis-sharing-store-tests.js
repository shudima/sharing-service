var sinon = require('sinon');
var expect = require('chai').expect;
var Stream = require('stream');

var createRedisSharingStore = require('../app/redis-sharing-store/');

var mockedRedisStream = new Stream();
mockedRedisStream.writable = true;
mockedRedisStream.readable = true;
mockedRedisStream.write = function(data) { /* Do Nothing */ };
mockedRedisStream.end = function(data) { /* Do Nothing */ };
mockedRedisStream.name = 'mocked redis'

var fakeRedisClient = require('redis-mock').createClient();
sinon.stub(require('redis'), 'createClient').returns(fakeRedisClient);
fakeRedisClient.writeStream = function () {};



describe('Redis Sharing Store', function () {

	it('Should store new file', function () {

		sinon.stub(fakeRedisClient, 'on').withArgs('connect').yields();

		var mockedFileStream = new Stream();
		mockedFileStream.readable = true;
		mockedFileStream.name = 'mocked file'

		sinon.stub(fakeRedisClient, 'writeStream').returns(mockedRedisStream);

		var p = createRedisSharingStore({})
			.then(store => store.writeStream(mockedFileStream))
			.then(() => {
				fakeRedisClient.on.restore();
				fakeRedisClient.writeStream.restore();
			});

		setTimeout(_ => {
			mockedFileStream.emit('data','test');
			mockedFileStream.emit('end');
			mockedRedisStream.emit('finish');
		}, 1000);

		return p;
	});

	it('Should return file', function () {
		sinon.stub(fakeRedisClient, 'on').withArgs('connect').yields();
		sinon.stub(fakeRedisClient, 'get').yields(null, '{"test" :"test"}');


		return createRedisSharingStore({})
		 	.then(store => store.get('some_key'))
		 	.then(result => {
		 		expect(result).to.exist;
		 		fakeRedisClient.on.restore();
		 		fakeRedisClient.get.restore();
		 	});
	});

	it('Should report error on connection error', function () {

		sinon.stub(fakeRedisClient, 'on').withArgs('error').yields();

		return createRedisSharingStore({})
			.catch(error => {
					expect(error).to.exist;
					fakeRedisClient.on.restore();
				});
	});	
});