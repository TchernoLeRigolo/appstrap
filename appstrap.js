var appstrap = (function() {
	var deviceready = false;
	var updateService = {};

	
	document.addEventListener('deviceready', function() {
		deviceready = true;
	}, false);

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

	function resolveAsset(filename, success, fail, forceRefresh) {
		var assetUrl = updateService.baseUrl + '/' + filename;
		console.log(assetUrl);

		var fileTransfer = new FileTransfer();

		if (forceRefresh) {
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

		xmlhttp.open("GET", url, true);
		xmlhttp.send();
	}

	function createMeta(p) {
		for(var m in p.meta) {
			addElement('meta', {name: m, content: p.meta[m]});
		}
	}

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

	function loadAsset(d, success, fail) {
		resolveAsset(d.url, function(entry) {
			var onload = function() {
				success(entry);
			}

			var onerror = function() {
				fail();
			}

			if (d.type === 'css') addElement('link', {rel: 'stylesheet', href: entry.nativeURL}, onload, onerror);
			if (d.type ==='script') addElement('script', {src: entry.nativeURL, type: 'text/javascript', charset: 'utf-8', async: true}, onload, onerror);
			
		}, fail)
	}

	updateService.checkUpdate = function(success, fail) {
		getFile(this.baseUrl + '/package.json', function(packageResponse) {
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

	updateService.updateApp = function() {
		var onfail = function(err) {
			document.dispatchEvent(new Event('appstrapfailed'))
		}

		getFile(this.baseUrl + '/package.json', function(packageResponse) {
			var dependenciesLoaded = 0;
			var dependenciesToLoad = 1;

			var pack = JSON.parse(packageResponse);

			createMeta(pack);

			resolveAsset('package.json', function(entry) {
				dependenciesLoaded++;

				for(var d in pack.dependencies) {
					var asset = pack.dependencies[d];
			    	dependenciesToLoad++;

			    	resolveAsset(asset.url, function(entry) {
						dependenciesLoaded++;

						if(dependenciesLoaded === dependenciesToLoad) {
			    			window.location.reload();
			    		}
					}, onfail, true)
				}
			}, onfail, true)
		}, onfail)
	}

	updateService.loadApp = function(pack, success, fail) {
		document.title = pack.name;
		var dependencies = orderDependencies(pack.dependencies);
		
		var loadOne = function() {
			var d = dependencies.shift();
			
			loadAsset(d, function(entry) {
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

	function initialize(baseUrl) {
		updateService.baseUrl = baseUrl;
			
		function init() {
			readFile('package.json', function(pack) {
				var currentPackage = JSON.parse(pack);
				updateService.pack = currentPackage;
				console.log('Appstrap loading', currentPackage);
				updateService.loadApp(currentPackage);
			}, function() {
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
		initialize(_htmlEndpoint);
	}

	return updateService;
})();