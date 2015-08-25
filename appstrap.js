(function() {
	console.log('Initializing appstrap');
	
	function readFile(filename, success, fail) {
		window.resolveLocalFileSystemURL(cordova.file.dataDirectory + filename, function(entry) {
			entry.file(function(file) {
				var reader = new FileReader();

				reader.onloadend = function(e) {
					success(this.result);
				}

				reader.readAsText(file);
			})
		}, function(err) {
			fail(err);
		})
	}

	function resolveAsset(filename, baseUrl, success, fail, forceRefresh) {
		var assetUrl;

		if (filename.match('^http*')) {
			assetUrl = filename + '?' + new Date().getTime();
			filename = filename.split('/').pop();
		} else {
			assetUrl = baseUrl + '/' + filename + '?' + new Date().getTime();
		}
		
		console.log('resolving asset', assetUrl);
		console.log('force = '+forceRefresh);

		var fileTransfer = new FileTransfer();

		if (forceRefresh) {
			console.log('force refresh of '+filename)
			fileTransfer.download(assetUrl, cordova.file.dataDirectory + filename, success, fail)
		} else {
			window.resolveLocalFileSystemURL(cordova.file.dataDirectory + filename, 
				function(entry) {
					success(entry)
				},
				function(err) {
					fileTransfer.download(assetUrl, cordova.file.dataDirectory + filename, success, fail)
				})
		}
	}

	function removeAsset(filename) {
		window.resolveLocalFileSystemURL(cordova.file.dataDirectory + filename, 
			function(entry) {
				console.log(entry.remove())
			}, 
			function(err) {
				console.log(err)
			})
	}

	function addElement(tag, attrs, onload, onerror) {
		var e = document.createElement(tag);
		if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
		
		//e.onload = onload;
		e.onload = function () {
			if (onload) onload();
		}

		e.onerror = onerror;

        if (typeof e != "undefined") {
            document.getElementsByTagName("head")[0].appendChild(e);
        }

        return e;
	}

	function getFile(url, success, fail) {
		var xmlhttp = new XMLHttpRequest();
		
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200 ) {
					if (success) success(xmlhttp.responseText);
				} else {
					if (fail) fail();
				}
			}
		}

		xmlhttp.open("GET", url+'?'+new Date(), true);
		xmlhttp.send();
	}

	function createMeta(p) {
		for(var m in p.meta) {
			addElement('meta', {name: m, content: p.meta[m]});
		}
	}

	/* Orders dependencies according to the sequence provided in package.json */
	function orderDependencies(dependencies) {
		var assets = [];
		for (var k in dependencies) assets.push(k);

		//scripts is now unordered list of script keys: now start ordering
		for (var k in dependencies) {
			var item = dependencies[k];

			if (item.requires !== null) {
				var requires = Array.isArray(item.requires) ? item.requires: [item.requires];
				requires.forEach(function(r) {
					//k needs to be after all requires (r)
					if (assets.indexOf(k) < assets.indexOf(r)) {
						assets.splice(assets.indexOf(k), 1);//remove k
						assets.splice(assets.indexOf(r) + 1, 0, k); //add k after r
					}
				})
			}
		}
		//now that they're ordered ... eval them!
		var ret = [];
		assets.forEach(function(s) {
			ret.push(dependencies[s]);
		})
		return ret;
	}

	/* Gets the local asset file and adds corresponding HTML head CSS or SCRIPT element */
	function loadAsset(d, baseUrl, success, fail) {
		resolveAsset(d.url, baseUrl, function(entry) {
			var onload = function() {
				success(entry);
			}

			var onerror = function() {
				fail();
			}

			if (d.type === 'css') {
				console.log('Adding CSS head element', entry.nativeURL);
				addElement('link', {rel: 'stylesheet', href: entry.nativeURL + '?' + new Date().getTime()}, onload, onerror);
			}

			if (d.type ==='script') {
				console.log('Adding SCRIPT head element', entry.nativeURL);
				addElement('script', {src: entry.nativeURL + '?' + new Date().getTime(), type: 'text/javascript', charset: 'utf-8'}, onload, onerror);
			}
		}, fail)
	}

	var deviceready = false;
	
	//check for device ready as it could already have been fired before all assets are available
	document.addEventListener('deviceready', function() {
		deviceready = true;
	}, false);

	//
	var updateService = {};

	/* Checks the remote location's package.json file for a new version. */
	updateService.checkUpdate = function(success, fail) {
		getFile(this.baseUrl + '/package.json?time='+new Date(), function(packageResponse) {
			var remotePack = JSON.parse(packageResponse);

			readFile('package.json', function(pack) {
				var curPack = JSON.parse(pack);

				if(remotePack.version != curPack.version) {
					if (success) success(true, remotePack, curPack);
				} else {
					if (success) success(false);
				}
			}, function(error) {
				if (success) success(true, remotePack);
			})
	    }, function() {
	    	if (fail) fail();
	    })
	}

	/* Force an update of the application. Downloads all assets and triggers a window reload. */
	updateService.updateApp = function() {
		console.log('UPDATE APP');
		var onfail = function(err) {
			document.dispatchEvent(new Event('appstrapfailed'))
		}

		console.log('deleting local package.json');
		removeAsset('package.json');
		getFile(this.baseUrl + '/package.json?time='+new Date(), function(packageResponse) {
			var dependenciesLoaded = 0;
			var dependenciesToLoad = 0;

			var pack = JSON.parse(packageResponse);
			console.log('remote package found', pack);
			createMeta(pack);

			for (var d in pack.dependencies) {
				var asset = pack.dependencies[d];
		    	dependenciesToLoad++;

		    	resolveAsset(asset.url, updateService.baseUrl, function(entry) {
		    		console.log('successfully downloaded '+ entry.nativeURL);

					dependenciesLoaded++;
					console.log('dependenciesLoaded', dependenciesLoaded, 'dependenciesToLoad', dependenciesToLoad)
					if(dependenciesLoaded === dependenciesToLoad) {

						resolveAsset('package.json', updateService.baseUrl, function() {
							window.location.reload();
						}, onfail, true)
		    		}
				}, onfail, true)
			}
			
		}, onfail)
	}

	/* Loads the application. Orders dependencies according to the package json file and add head CSS & SCRIPT elements accordingly. */
	updateService.loadApp = function(pack, success, fail) {
		console.log('LOAP APP');
		document.title = pack.name;
		var dependencies = orderDependencies(pack.dependencies);
		
		var loadOne = function() {
			var d = dependencies.shift();
			
			loadAsset(d, updateService.baseUrl, function(entry) {
				if (dependencies.length === 0) {
					setTimeout(function() {
						//angular.element(document).ready(function () {
					    if (success) success(pack);
					    console.log('app ready for boot');
					    document.dispatchEvent(new Event('appstrapready'))

					    setTimeout(function() {
					    	if (deviceready) window.dispatchEvent(new Event('deviceready'));
					    }, 0)
						//})
					}, 0);
				} else {
					loadOne();
				}
			}, fail)
		}

		loadOne();
	}

	/* Initializes the application. Reads the local package.json and loads app. If none exists, the force update the app. */
	updateService.initialize = function(baseUrl) {
		updateService.baseUrl = baseUrl;
			
		function init() {
			readFile('package.json', function(pack) {
				var currentPackage = JSON.parse(pack);
				updateService.pack = currentPackage;
				console.log('Appstrap loading', currentPackage);
				updateService.loadApp(currentPackage);
			}, function() {
				console.log('Appstrap loading: no current package. Updating app...')
				updateService.updateApp();
			})
		}

		document.addEventListener('deviceready', function() {
			window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, init, function(err) {
				console.log('Failed to instantiate file system', err);
			});
		}, false)
	}

	var _htmlEndpoint = document.getElementsByTagName('html')[0].getAttribute('appstrap');

	if (_htmlEndpoint) {
		updateService.initialize(_htmlEndpoint);
	}

	window.appstrap = updateService;
})();
