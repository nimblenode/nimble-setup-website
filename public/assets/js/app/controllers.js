'use strict';

angular.module('Application.controllers', [])

.controller("LandingController", ["$scope", "$timeout", function($scope, $timeout) {

      let nimbleRequestTimeout = 10000;
      let nimbleConnectTimeout = 90000;
      let nimbleScanTimeout = 15000;
      let nimbleEncryptionKeyTimeout = 15000;

      let nimbleIP = "192.168.10.1";
      let nimblePort = "3001";
      let nimbleAPI = "http://" + nimbleIP + ":" + nimblePort

      let nimble = {};

      nimble.checkNimbleConnection = function() {
           return new Promise(function(resolve, reject) {
              $.ajax({url: nimbleAPI + "/", timeout:nimbleRequestTimeout})
                  .then(function(data) {
                      resolve(true)
                  })
                  .fail(function() {
                      resolve(false)
                  })
            });
      };

      nimble.hasWifi = function() {
            return new Promise(function(resolve, reject) {
                  $.ajax({url: nimbleAPI + "/api/wifi/inet", timeout:nimbleRequestTimeout})
                      .then(function(data) {
                          resolve(data.inets.length > 0)
                      })
                      .fail(function() {
                          resolve(false)
                      })
            });
      };

      nimble.getWifiStatus = function() {
        return new Promise(function(resolve, reject) {
              $.ajax({url: nimbleAPI + "/api/wifi/status", timeout:nimbleRequestTimeout})
                  .then(function(data) {
                      resolve(data)
                  })
                  .fail(function() {
                      resolve(false)
                  })
        });
  };

      nimble.getWifiConnections = function() {
            return $.ajax({url: nimbleAPI + "/api/wifi/scan/essid", timeout:nimbleScanTimeout})
      };

      nimble.attemptToConnect = function(ssid, password) {
          let _data = {}
          _data.ssid = ssid || ""
          _data.password = password || ""
          _data.should_save = "true"
          return $.ajax({url: nimbleAPI + "/api/wifi/network/new", data: _data, timeout:nimbleConnectTimeout})
      };

      nimble.generateEncryptionKeys = function() {
           return new Promise(function(resolve, reject) {
              $.ajax({url: nimbleAPI + "/api/encryption/set_device_keys", timeout: nimbleEncryptionKeyTimeout})
                  .then(function(data) {
                      resolve(data)
                  })
                  .fail(function() {
                      resolve(false)
                  })
            });
      };

      $scope.popup = {
          title: "",
          text: "",
          visible: false,
          show: function(title, text) {
              this.title = title || ""
              this.text = text || ""
              this.visible = true;
          },
          hide: function() {
              this.visible = false;
          }
      };

      $scope.wifipopup = {
          network: {},
          visible: false,
          page: 1,
          show: function(network) {
              this.page = 1;
              this.timer = nimbleConnectTimeout/1000;
              this.visible = true;
              this.network = network || {}
          },
          startTimer: function() {
            let that = this;
            let timerInterval = setInterval(function() {
                $timeout(function() {
                    that.timer--;
                    if (that.timer <= 0) {
                      clearInterval(timerInterval)
                    }
                })
             },1000);
             return timerInterval;
          },
          connect: function(allowNoPassword) {
              if (!this.network.password && !allowNoPassword) return;
              this.page = 2;

              let that = this;
              let interval = this.startTimer();
              nimble.attemptToConnect(this.network.ssid, this.network.password)
                .then(function(data) {
                      $timeout(function() {
                          clearInterval(interval)
                          that.hide();
                          $scope.waitingindicator.show("Testing Connection", "This may take a few seconds.");
                          nimble.hasWifi().then(function(hasWifi) {
                              $timeout(function() {
                                  $scope.waitingindicator.hide()
                                  if (hasWifi) {
                                      $scope.next();
                                  }
                                  else {
                                      $scope.popup.show("Unable to Connect", "Your nimbleNODE was unable to connect to the selected wifi network. Try connecting again.")
                                  }
                              })
                          });
                      }, 1000)
                })
          },
          hide: function() {
              this.visible = false;
          }
      };

      $scope.waitingindicator = {
          title: "",
          text: "",
          visible: false,
          show: function(title, text) {
              this.title = title || ""
              this.text = text || ""
              this.visible = true;
          },
          hide: function() {
              let that = this;
              $timeout(function() {
                  that.visible = false;
              })
          }
      };

      $scope.networks = [];

      $scope.page = 1;

      $scope.next = function() {
          // Check if this device is connected to
          // the nimbleNODE
          if ($scope.page === 3) {
                $scope.waitingindicator.show("Checking Connection", "This will take a few seconds.")
                nimble.checkNimbleConnection().then(function(isConnected) {
                      $timeout(function() {
                            if (!isConnected) {
                                 $scope.waitingindicator.hide()
                                 $scope.popup.show("Not Connected", "It appears you are not connected to your nimbleNODE. Check your connection.")
                           }
                           else {
                              $timeout(function() {
                                $scope.waitingindicator.hide();
                              }, 1000);
                              $scope.page++
                           }
                      })
                })
          }
          // Attempt to generate the encryption keys
          else if ($scope.page === 4) {
                $scope.waitingindicator.show("Generating Encryption Keys", "This will take a few seconds.")
                nimble.generateEncryptionKeys().then(function(keys) {
                      $timeout(function() {
                           if (!keys) {
                              $scope.waitingindicator.hide()
                              $scope.popup.show("Unable to generate keys", "Your device was unable to create encryption keys. Check to make sure your nimbleNODE is powered on and your wifi connection is switched to your nimbleNODE.")
                           }
                           else {
                              $scope.page++
                              $scope.scanNetworks();
                           }
                      })
                })
          }
          else {
              $scope.page++
          }
      };

      $scope.back = function() {
          $scope.page--
      };

      $scope.networks = [];

      $scope.scanNetworks = function() {
          $scope.networks = [];
          $scope.waitingindicator.show("Scanning nearby networks", "This will take a few seconds.")
          nimble.getWifiConnections()
              .then(function(data) {
                  $timeout(function() {
                      $scope.waitingindicator.hide();
                      if (data.networks.length == 0) {
                          $scope.popup.show("No Nearby Networks Found", "Your nimbleNODE was unable to find nearby networks. Try scanning again by clicking on the refresh option below.")
                      }
                      else {
                          data.networks = data.networks.filter(function(network) {
                              return network.ssid.indexOf("\\x00") == -1
                          });
                          $scope.networks = data.networks;
                      }
                  })
              })
              .fail(function() {
                  $timeout(function() {
                      $scope.waitingindicator.hide()
                      $scope.popup.show("Could not find networks", "Unable to find networks. Make sure your connected to your nimbleNODE.")
                  })
              })
      };
}])
