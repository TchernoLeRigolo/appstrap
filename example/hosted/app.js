angular.module('app', ['ionic'])
	.directive('body', function() {
		return function link($scope, $element, $attrs) {
			$element.text('Hello world from appstrap example!')
		}
	})