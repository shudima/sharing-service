# Sharing-Service

A very basic service for file sharing. Uses Redis for storage.

### Installation

```sh
git clone https://github.com/shudima/sharing-service
cd sharing-service
npm install
npm test
```
To start the service use:
```sh
npm start
```
Don't forget to config it at ./config.json

### Usage

Upload file:
```sh
curl -F curl -F "file=@./path/to/file" http://hostname:port/upload-file/
```
This will return an http link like this one:
```sh
http://hostname:port/file/82f15aa0-7367-11e6-b781-19d81b21e561
```
 Use this link to download the file.
 
### Notes
  - The link expires after 24 hours
  - You can use "&password=SOMEPASSWORD" on both calls for specific password encryption
  - Default port is 3000, you can change it in config.json


### Architecture
Simple NodeJS+Express server.
Streaming the file to crypto and then to Redis.

### TODO
- Use more secure authentication system (OAuth?)
- Encrypt and store the default password
- Use Messages Queueing system for more scalability when there will be more thing to do with the files before storing in Redis.