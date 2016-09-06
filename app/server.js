var config = require('../config.json');
var express = require('express');
var Busboy = require('busboy');
var bodyParser = require('body-parser')
var createRedisSharingStore = require('./redis-sharing-store/');

init()
	.then(createApp)
	.then(startService)
	.catch(handleError);


function init() {
	console.log('Connecting to Redis on %s', JSON.stringify(config.redisSharingStoreConfig));
	return createRedisSharingStore(config.redisSharingStoreConfig);
}


function createApp(redisSharingStore) {
	var app = express();
	var parser = bodyParser.urlencoded({ extended: true });

	app.use(express.static('../client'));

	app.post('/upload-file/', function (req, res) {
		console.log('Setting new file');
		var busboy = new Busboy({ headers: req.headers });
		
		var password = '';

		busboy.on('field', (fieldname, val) => {
			if (fieldname == 'password') password = val;
		});

		busboy.on('file', (fieldname, file, filename) => 
				redisSharingStore.writeStream(file, filename, password)
					.then(key => res.send(buildLink(key)))
					.catch(error => res.send({ message : 'Error getting file.', error : error.message })));

		req.pipe(busboy);
	});


	function getFile(res, key, password) {
		console.log('Getting file for %s', key);

		redisSharingStore.get(key, password).then(file => {

			if(file.error && file.error == 'Password Required') {
				res.redirect('/download.htm?key=' + key);
			} else if (file.error) {
				res.send({ error : error });
			} else {
				res.setHeader( "Content-Disposition", "filename=" + file.metadata.filename);
				res.setHeader('Content-Type','application/octet-stream');
				res.end(file.file);
			}
		})
		.catch(error => res.send({ message : 'Error getting file.', error : error.message }));	
	}

	app.get('/file/:fileid', function(req,res) {
		var key = req.params.fileid;

		getFile(res, key);
	});

	app.post('/file', parser, function(req,res) {
		var key = req.body.key;
		var password = req.body.password;

		getFile(res, key, password);
	});

	app.use(function(err, req, res, next) {
	  console.error(err.stack);
	  res.status(500).send(err.message);
	});

	return Promise.resolve(app);
}

function buildLink(key) {
	return 'http://' + config.serverHost + ':' + config.serverPort + '/file/' + key;
}

function startService(app) {
	app.listen(config.serverPort, function () {
  		console.log('Listening on ' + config.serverPort);
	});
}

function handleError(error) {
	console.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
}