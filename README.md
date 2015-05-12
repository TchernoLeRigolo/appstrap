# appstrap
Install and update your hybrid app from a remote web server. No need to publish to the App Store or Play Store - just publish your JS & CSS files on a static web server, include a description "package.json" file and you'll be able to install and update your app instantly. This complies with the App & Play store Terms and Conditions. 

## Requirements

Requires cordova File and FileTransfer plugins. To install them in your cordova project type:

```cordova plugins add org.apache.cordova.file-transfer```

## Install

Soon: ```npm install cordova-appstrap```

## Structure of the package.json file

```
{
  "name": "Application Name",
  "version": "0.0.1",
  "description": "Application description",
  "author": "Somebody",
  "license": "Blabla",
  "charset": "utf-8",

  "meta": {
   
  },

  "dependencies": {
		"icons": {
      "url": "images.css", 
      "type": "css"
    },
    "fonts": {
      "url": "fonts.css", 
      "type": "css"
    },
		"css": {
      "url": "app.css", 
      "type": "css"
    },
		"ionicCss": {
      "url": "ionic.css", 
      "type": "css"
    },
    "app": {
      "url": "app.js", 
      "type": "script", 
      "requires": "libs"
    },
		"libs": {
      "url": "libs.js", 
      "type": "script"
      }
  }
}
```
