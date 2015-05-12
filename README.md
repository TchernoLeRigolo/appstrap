# cordova-appstrap
Install and update your hybrid app from a remote web server. No need to publish to the App Store or Play Store - just publish your JS & CSS files on a static web server, include a description "package.json" file and you'll be able to install and update your app instantly. This complies with the App & Play store Terms and Conditions. 

## Requirements

Requires cordova File and FileTransfer plugins. To install them in your cordova project type:

```cordova plugins add org.apache.cordova.file-transfer```

## Install

Soon: ```npm install cordova-appstrap```

## The main HTML file

Because the app is hosted for download, the HTML file shipping with your cordova project's application package (APK or IPA) is a simple "App downloading" page. 

A small example of an Angular appstrap page:
```
<!DOCTYPE html>
<html appstrap="http://point-to-your-web-server">
	<head>
		<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="mobile-web-app-capable" content="yes">

		<link href="appstrap.css" rel="stylesheet">

		<script>
			document.addEventListener('appstrapready', function() {
				angular.bootstrap(document, ['app']);
			})

			document.addEventListener('appstrapfailed', function() {
				console.log('app download failed, allow for retry');
				
				document.getElementById('appstrap-retry').style.display = 'block';
			})
		</script>

		<script src="cordova.js"></script>
		<script src="appstrap.js"></script>
	</head>

	<body>
		<div id="appstrap">
			<img src="logo.svg">
			<p>Downloading application, please wait...</p>
			<br/>

			<span id="appstrap-retry" style="display:none">
				<p>Could not download app, please check your internet connection.</p>
				<br />
				<button onClick="window.location.reload()">Retry</button>
			</span>
		</div>
	</body>
</html>
```

## Initializing appstrap

Appstrap will check for an 'appstrap' attribute on the body tag (see example above) and automatically initialize itself. It is also possible to initialize appstrap manually:

``` appstrap.initialize('http://point-to-your-web-server'); ```

## The package.json file

When publishing your files to the remote web server, ensure to increment the version number in the package.json file - this will trigger an application upgrade. It is up to you to do the application upgrade check in your app.

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
The 'dependencies' list the files which your application requires to run. 'css' types will add a link tag in the head, while the 'script' type will add a script tag.


## Checking for an update

An Angular example for an update check service:

```
module.factory('UpdateService', function() {
	return function() {
		window.appstrap.checkUpdate(function(check, pack) {
			//The remote version number differs from the local one
			if (check) {
				if (confirm('A new version is available. Install it?')) {
					window.appstrap.updateApp();
				}
			}
		})
	}
})
```

## TODO

- Handle multiple downloads at once (eg. using 4 download workers...)
- Handle non-JS-or-CSS files (simple download)
- Handle progress callback to allow for a download progress bar
- Other ideas?
