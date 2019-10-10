'use strict';

angular.module('Application', [
  'ngRoute',
  'Application.controllers',
  'Application.factory'
]).
config(['$locationProvider', '$interpolateProvider', '$routeProvider', function($locationProvider, $interpolateProvider, $routeProvider) {

    // URL prefix
    $locationProvider.html5Mode(true);

    // Application routing
    $routeProvider
      .when("/", {
          templateUrl : "/static/views/pages/landing.html"
      })
      .otherwise("/");
}]);
