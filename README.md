# slack-app

### Requirements
- [node.js](https://nodejs.org/en)
- Fill env file and change its name 
    - (Linux, MacOS) `.sample.env` -> `.env` 
    - (Windows) `sample.env.bat` -> `env.bat`

### Preparatoin
```bash
npm install

# Linux, MacOS 
source .env

# Windows
call env.bat
```

### Dev Environment
```bash
npm start
```

### Prod Environment
```bash
docker build -t slack-app-docker-image .
docker run -d -p 9000:9000 slack-app-docker-image
```