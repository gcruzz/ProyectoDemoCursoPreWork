var Sana = Sana || {};
Sana.Facility = (function () {
    //Create methods for find Parking.
    var findParking = function (self) {
        var $this = $(self);
        var $contractOn = $this.find('#contactOn > div');
        if ($.trim($contractOn.html()))
            Sana.Message.Alert($contractOn.html(), 'Alert!');
        Facility._searchFacility = $this.find('#Address');
        Facility._searchService = $this.find('#byService');
        var $noRefresh = false;
        if ($this.find('#errorWaiting').length > 0) {
            Sana.Message.Alert($this.find('#errorWaiting').html(), 'Alert!');
        }
        Sana.UI.LoadingIndicator.show();
        Facility._this = $this;
        Facility.formFacility = $this.find('form#formFacility');
        Facility.markMap();
        Facility._itemClass = $this.find('.itemClass');
        Facility._startDate = $this.find('input[name=StartDate]');
        Facility._endDate = $this.find('input[name=EndDate]');
        Facility._itemSelected = $this.find('#itemSelected');
        Facility._quantity = $this.find('input[name=quantity]');
        Facility._attributes = $this.find('#attributes');
        Facility._productName = $this.find('#productName');
        Facility._startDateSelect = Facility._this.find('select[name=StartDateSelect]');
        Facility.initializeDates(true);
        Facility.initializeQuantity();
        Facility._searchFacility.change(function () {
            Facility.fields.facilityCodeBool = true;
            if (!$noRefresh) {
                Facility.findWithSearch(Facility._searchFacility);
            }
            $noRefresh = false;
            Facility.fields.facilityCodeBool = false;
        });
        Facility._searchFacility.keypress(function (e) {
            if (e.keyCode === '13' && $.trim(e.target.value) === '') {
                Facility.findWithSearch(Facility._searchFacility);
                $noRefresh = true;
            } else
                if (e.keyCode === '13') {
                    Facility._searchFacility.trigger('change');
                    $noRefresh = true;
                }
        });
        if (Facility._searchFacility.val()) {
            setTimeout(function () {
                Sana.UI.LoadingIndicator.show();
                Facility.fields.waitingList = Facility._this.find('#WLGUID').val();
                Facility.placesChanged();
            }, 1000);
        }
        Facility._searchService.change(function (e) {
            Facility.findWithSearchService(e.target);
        });
        Facility._startDateSelect.change(function (e) {
            Facility._startDate.val(e.target.value);
            if (Facility._endDate.datepicker().length > 0)
                Facility._endDate.datepicker("destroy");
            Facility._endDate.val('');
            Facility.itemSelectByProductAndDate();
        });
        Facility._quantity.change(function (e) {
            e.target.value = (parseInt(e.target.value) > parseInt($(e.target).attr('data-max'))) ? $(e.target).attr('data-max') : e.target.value;
        });
    };

    //Grid parking with items by facility
    var findParkingGrid = function ($this) {
        var $mvGridEmpty = $this.find('.mvc-grid-empty-row');
        if ($mvGridEmpty.length > 0) {
            Sana.UI.LoadingIndicator.hide();
            Sana.Message.AlertF(Facility._this.find('#msgByServiceAssocInFacilityButNotWotk').html(), 'Alert!', function () {
                Facility._searchService.val("");
                Facility._searchFacility.val("");
                $('div#facilityName').html('');
                Facility.placesChanged();
            });
            return false;
        }
        var $trClick = $this.find('#FacilityGrid tbody tr');
        Sana.UI.LoadingIndicator.hide();
        $trClick.click(function (e) {
            var $this = Facility._this;
            var $tdClass = $(e.target);
            var $trClass = $tdClass.parents('tr');
            Facility.fields.Frecuency = $trClass.find('input[name=Frecuency]:first').val().toLowerCase();
            var $data = { frequencyId: Facility.fields.Frecuency };
            $.post(
                '/Facility/FindFrequency',
                $data
            ).done(function (result) {
                Facility._frequency = result;
                Facility.formFacilityItems = $this.find('form#formFacilityItems');
                Facility._startDate.val('');
                Facility._endDate.val('');
                var $trClick = $this.find('#FacilityGrid tbody tr');
                $.each($trClick, function ($i, $item) {
                    $($item).removeClass('selected');
                });
                Facility._itemClass.attr('class', 'itemClass');
                Facility.fields.itemId = $trClass.find('input[name=itemId]:first').val();
                Facility.fields.permitTypeCode = $trClass.find('input[name=permitTypeCode]:first').val();
                Facility.fields.meterRental = ($trClass.find('input[name=MeterRentalChk]:first').val().toLowerCase() === 'true');
                Facility.fields.ePermit = ($trClass.find('input[name=permitType]:first').val().toLowerCase() === 'true');
                Facility.fields.waiting = ($trClass.find('input[name=waiting]:first').val().toLowerCase() === 'true');
                Facility._itemSelected.removeAttr('style');
                $trClass.addClass('selected');
                var $billing = $trClass.find('input[name=Billing]');
                Facility._this.find('#quantityInput').css('display', 'none');
                Facility._this.find('#quantitylabel').removeAttr('style');
                Facility._this.find('label#avalibility').html('0');
                Facility._itemClass.find('#waiting').css('display', 'none');
                Facility._itemClass.find('#d_quantity').removeAttr('style');
                Facility.fields.billing = $.trim($billing.val().toLowerCase()) === 'true';
                if (!Facility.fields.meterRental) {
                    $('body').addClass('noCalendar');
                    Facility._endDate.parents('.form-row:first').css('display', 'none');
                } else {
                    $('body').removeClass('noCalendar');
                    Facility._endDate.parents('.form-row:first').removeAttr('style');
                }
                Facility.initializeDates(false);
                if (Facility.fields.billing) {
                    Facility._itemClass.addClass('noDateEnd');
                } else {
                    Facility._itemClass.addClass('dateEnd');
                }
            });
        });
    };

    var findMarkViewPolygon = function (facilityCode) {
        Facility._polygonLngLat2 = [];
        var $data = { facilityCode: facilityCode };
        Facility._searchFacility.val(facilityCode);
        $.post(
            '/Facility/Polygons',
            $data
        ).done(function (result) {
            var lst = JSON.parse(result.PoligonPoints);
            for (i = 0; i < lst.length; i++) {
                for (var x = 0; x < lst[i].length; x++) {
                    for (var y = 0; y < lst[i][x].length; y++) {
                        var ln = parseFloat(lst[i][x][y][0]);
                        var lt = parseFloat(lst[i][x][y][1]);
                        if (ln !== 0 && lt !== 0) {
                            var polygon = new google.maps.LatLng(lt, ln);
                            Facility._polygonLngLat2.push(polygon);
                        }
                    }
                }
            }
            Facility.placesChanged2(result);
        });
    };

    //All functions by page Facility
    var func = function () {
        /*
         * Create:  J.Peña
         * Date:    09/24/2018
         * Desc:    Functions by Facilities.
        */
        var Facility = {
            fields: {
                facilityCode: '',
                facilityCodeBool: false,
                itemId: '',
                itemQtyAvailable: 0,
                permitTypeCode: '',
                waitingList: null,
                billing: false,
                itemCategory: '',
                ePermit: false,
                waiting: false,
                meterRental: false,
                Frecuency: '',
                zipCode: '',
                city: ''
            },
            //form facility
            formFacility: '',
            //form items by facility
            formFacilityItems: '',
            //form waiting list
            formWaitingList: '',
            //_this products
            _this: '',
            //div item with id = itemClass
            _itemClass: '',
            //div item with id = startDate
            _startDate: '',
            //div item with id = endDate
            _endDate: '',
            //div item with id = itemSelected
            _itemSelected: '',
            //input[name=quantity]
            _quantity: '',
            //div item with id = attributes
            _attributes: '',
            //div item with id = productName
            _productName: '',
            //button[name=btnAddCart]
            _btnAddToCart: '',
            //error true or false
            _boolAddToCart: false,
            //button[name=waitingList]
            _btnWaitingList: '',
            //info windows google maps InfoWindows
            _infoWindows: [],
            //mapid
            _map: '',
            //Markers google maps Marks
            _markers: [],
            //Search Facility
            _searchFacility: '',
            //Search Service dropdown
            _searchService: '',
            //places change
            _searchBox: '',
            //polygon lng,lat
            _polygonLngLat2: [],
            _polygonLngLat: [],
            //polygon
            _polygon: [],
            //Json Frequency
            _frequency: [],
            //Select Start Date
            _startDateSelect: null,
            _allFacilities: null,
            //Mark in the map
            markMap: function () {
                $this = this;
                var $mapid = this._this.find('mapid');
                var $inputFacility = this._this.find('#allFacilities');
                if ($mapid) {
                    var map = new google.maps.Map(document.getElementById('mapid'), {
                        center: { lat: 25.7934359, lng: -80.22554973 },
                        zoom: 11,
                        mapTypeId: 'roadmap'
                    });
                    $this._map = map;
                    // Create the search box and link it to the UI element.
                    var input = document.getElementById('Address');
                    $this._searchBox = new google.maps.places.SearchBox(input);

                    // Bias the SearchBox results towards current map's viewport.
                    map.addListener('bounds_changed', function () {
                        $this._searchBox.setBounds(map.getBounds());
                    });
                    var markers = [];
                    // Listen for the event fired when the user selects a prediction and retrieve
                    // more details for that place.

                    $this._searchBox.addListener('places_changed', function () {
                        $this.placesChanged();
                    });

                    $mapid.css('height', '500px');
                    var PolygonPoints = JSON.parse('[""]');
                    $this._allFacilities = JSON.parse($inputFacility.val());
                    $this.markers($this._map, $this._allFacilities);
                }
            },
            placesChanged2: function ($facility) {
                $this = this;
                var $search = $(document.getElementById('Address'));
                var places = $this._searchBox.getPlaces();
                var $newMarkers = [];
                var $newMarkers2 = [];
                $.each($this._allFacilities, function ($i, $item) {
                    if ($item.Status === "1") {
                        $newMarkers.push($item);
                    }
                });

                if ($search.val() === "") {
                    $MarkersFilter = $newMarkers;
                    var $mapFacility = this._this.find('.content-facility');
                    $mapFacility.removeClass('animate');
                } else {
                    var $MarkersFilter = $.grep($newMarkers, function ($item, $i) {
                        return ($item.FacilityCode === $search.val() ||
                            ($item.StreetAddress).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            ($item.Description).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            ($item.City).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            $item.ZipCode === $search.val());
                    });
                }
                for (var i = 0; i < $this._markers.length; i++) {
                    $this._markers[i].setMap(null);
                }
                for (i = 0; i < $this._polygon.length; i++) {
                    $this._polygon[i].setMap(null);
                }
                for (i = 0; i < $this._infoWindows.length - 1; i++) {
                    $this._infoWindows[i].close();
                }
                if ($MarkersFilter.length < 1) {
                    $newMarkers2 = $newMarkers;
                } else {
                    $newMarkers2 = $MarkersFilter;
                }
                $this._markers = [];
                $this._polygon = [];
                $this._polygonLngLat = [];
                $this._infoWindows = [];
                $this.markers($this._map, $newMarkers2);
                if ($this._markers.length === 1) {
                    new google.maps.event.trigger($this._markers[0], 'click');
                }
                markers = [];
                var bounds = new google.maps.LatLngBounds();

                if ($MarkersFilter.length < 1) {
                    // For each place, get the icon, name and location.

                    places.forEach(function (place) {
                        if (!place.geometry) {
                            console.log("Returned place contains no geometry");
                            return;
                        }
                        var icon = {
                            url: place.icon,
                            size: new google.maps.Size(71, 71),
                            origin: new google.maps.Point(0, 0),
                            anchor: new google.maps.Point(17, 34),
                            scaledSize: new google.maps.Size(25, 25)
                        };
                        if (place.geometry.viewport) {
                            // Only geocodes have viewport.
                            bounds.union(place.geometry.viewport);
                        } else {
                            bounds.extend(place.geometry.location);
                        }
                    });
                } else if ($this._markers.length > 0) {
                    for (i = 0; i < $this._markers.length; i++) {
                        bounds.extend($this._markers[i].getPosition());
                    }
                } else {
                    $.each($this._polygonLngLat2, function (i, item) {
                        bounds.extend(item);
                    });
                }
                $this._map.fitBounds(bounds);
            },
            //Search point in the map with address, zipcode, facility
            placesChanged: function () {
                $this = this;
                var $search = $(document.getElementById('Address'));
                var places = $this._searchBox.getPlaces();
                var $newMarkers = [];
                var $newMarkers2 = [];
                $.each($this._allFacilities, function ($i, $item) {
                    if ($item.Status === "1") {
                        $newMarkers.push($item);
                    }
                });

                if ($search.val() === "") {
                    $MarkersFilter = $newMarkers;
                    var $mapFacility = this._this.find('.content-facility');
                    $mapFacility.removeClass('animate');
                } else {
                    var $MarkersFilter = $.grep($newMarkers, function ($item, $i) {
                        return ($item.FacilityCode === $search.val() ||
                            ($item.StreetAddress).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            ($item.Description).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            ($item.City).toLowerCase().indexOf($search.val().toLowerCase()) !== -1 ||
                            $item.ZipCode === $search.val());
                    });
                }
                for (var i = 0; i < $this._markers.length; i++) {
                    $this._markers[i].setMap(null);
                }
                for (i = 0; i < $this._polygon.length; i++) {
                    $this._polygon[i].setMap(null);
                }
                for (i = 0; i < $this._infoWindows.length - 1; i++) {
                    $this._infoWindows[i].close();
                }
                if ($MarkersFilter.length < 1) {
                    $newMarkers2 = $newMarkers;
                } else {
                    $newMarkers2 = $MarkersFilter;
                }
                $this._markers = [];
                $this._polygon = [];
                $this._polygonLngLat = [];
                $this._infoWindows = [];
                $this.markers($this._map, $newMarkers2);
                if ($this._markers.length === 1) {
                    new google.maps.event.trigger($this._markers[0], 'click');
                }
                markers = [];
                var bounds = new google.maps.LatLngBounds();

                if ($MarkersFilter.length < 1) {
                    // For each place, get the icon, name and location.

                    places.forEach(function (place) {
                        if (!place.geometry) {
                            console.log("Returned place contains no geometry");
                            return;
                        }
                        var icon = {
                            url: place.icon,
                            size: new google.maps.Size(71, 71),
                            origin: new google.maps.Point(0, 0),
                            anchor: new google.maps.Point(17, 34),
                            scaledSize: new google.maps.Size(25, 25)
                        };
                        if (place.geometry.viewport) {
                            // Only geocodes have viewport.
                            bounds.union(place.geometry.viewport);
                        } else {
                            bounds.extend(place.geometry.location);
                        }
                    });
                } else if ($this._markers.length > 0) {
                    for (i = 0; i < $this._markers.length; i++) {
                        bounds.extend($this._markers[i].getPosition());
                    }
                } else {
                    for (i = 0; i < $this._polygonLngLat.length; i++) {
                        bounds.extend($this._polygonLngLat[i]);
                    }
                }
                $this._map.fitBounds(bounds);
            },
            //find facilities with zip, address, facility code, etc
            findWithSearch: function ($search) {
                var $this = this;
                if (!$search.val()) {
                    var $newMarkers = [];
                    $.each($this._allFacilities, function ($i, $item) {
                        if ($item.Status === "1") {
                            $newMarkers.push($item);
                        }
                    });
                    for (var i = 0; i < $this._markers.length; i++) {
                        $this._markers[i].setMap(null);
                    }
                    for (i = 0; i < $this._polygon.length; i++) {
                        $this._polygon[i].setMap(null);
                    }
                    $this._markers = [];
                    $this._polygon = [];
                    $this._polygonLngLat = [];
                    $this._infoWindows = [];
                    $this.markers(this._map, $newMarkers);
                    var $mapFacility = this._this.find('.content-facility');
                    $mapFacility.removeClass('animate');
                    var bounds = new google.maps.LatLngBounds();
                    for (i = 0; i < $this._markers.length; i++) {
                        bounds.extend($this._markers[i].getPosition());
                    }
                    this._map.fitBounds(bounds);
                }
            },
            //find service, facility by items
            findWithSearchService: function (self) {
                var $this = this;
                var $newMarkers = [];
                var $newMarkers2 = [];
                if (self.value !== '') {
                    $.each($this._allFacilities, function ($i, $item) {
                        if ($item.Status === "1") {
                            $newMarkers.push($item);
                        }
                    });
                    var $MarkersFilter = $.grep($newMarkers, function ($item, $i) {
                        return ($.grep($item.ItemCollection, function ($itemCollection, $x) {
                            return ($itemCollection.ItemID === self.value);
                        }).length > 0);
                    });
                    for (var i = 0; i < $this._markers.length; i++) {
                        $this._markers[i].setMap(null);
                    }
                    $this._markers = [];
                    $this._infoWindows = [];
                    $this._polygon = [];
                    $this._polygonLngLat = [];
                    if ($MarkersFilter.length > 0) {
                        $this.markers(this._map, $MarkersFilter);
                        var bounds = new google.maps.LatLngBounds();
                        if ($this._markers.length > 0) {
                            for (i = 0; i < $this._markers.length; i++) {
                                bounds.extend($this._markers[i].getPosition());
                            }
                        } else {
                            for (i = 0; i < $this._polygonLngLat.length; i++) {
                                bounds.extend($this._polygonLngLat[i]);
                            }
                        }
                        if ($this._markers.length === 1) {
                            new google.maps.event.trigger($this._markers[0], 'click');
                        }
                        this._map.fitBounds(bounds);
                    } else {
                        Sana.UI.LoadingIndicator.hide();
                        Sana.Message.AlertF($this._this.find('#msgByServiceNoFoundInFacility').html(), 'Alert!', function () {
                            $(self).val("");
                            $(self).val("");
                            $this.placesChanged();
                        });
                    }
                } else {
                    $this._searchFacility.val('');
                    $this.placesChanged();
                }
            },
            //Load all marks of the facilities
            markers: function (map, $markersSelect) {
                var $newMarkers = [];
                $.each($markersSelect, function ($i, $item) {
                    if ($item.Status === "1") {
                        $newMarkers.push($item);
                    }
                });
                this.marks(map, $newMarkers);
            },
            //Marks in the google maps
            marks: function (maps, $newMarkers) {
                var $this = this;
                var $load = $.each($newMarkers, function ($i, $item) {
                    var infowindow = new google.maps.InfoWindow({
                        content: 'Facility # ' + $item.FacilityCode + '<p>' + $item.Description + '</p>'
                    });
                    if ($.trim($item.PoligonPoints) !== '') {
                        var $linkPolygon = '<a href="javascript:Sana.Facility.findMarkViewPolygon(\'' + $item.FacilityCode + '\')">View Polygon</a>';
                        infowindow = new google.maps.InfoWindow({
                            content: 'Facility # ' + $item.FacilityCode + '<p>' + $item.Description + '<br />' + $linkPolygon + '</p>'
                        });
                    }
                    if ($newMarkers.length === 1 && $.trim($item.PoligonPoints) !== '') {
                        $this._polygonLngLat2 = [];
                        var $data = { facilityCode: $item.FacilityCode };
                        $.post(
                            '/Facility/Polygons',
                            $data
                        ).done(function (result) {
                            var bounds = new google.maps.LatLngBounds();
                            var lst = JSON.parse(result.PoligonPoints);//
                            for (i = 0; i < lst.length; i++) {
                                for (var x = 0; x < lst[i].length; x++) {
                                    for (var y = 0; y < lst[i][x].length; y++) {
                                        var ln = parseFloat(lst[i][x][y][0]);
                                        var lt = parseFloat(lst[i][x][y][1]);
                                        if (ln !== 0 && lt !== 0) {
                                            var polygon = new google.maps.LatLng(lt, ln);
                                            $this._polygonLngLat2.push(polygon);
                                            bounds.extend(polygon);
                                        }
                                    }
                                }
                                if ($this._polygonLngLat2.length > 0) {
                                    $this.Polygon2(maps, $this._polygonLngLat2);
                                    $this._polygonLngLat2 = [];
                                }
                            }
                            maps.fitBounds(bounds);
                            $this.loadItems(event, $item.FacilityCode);
                            var $divTitle = $('<div />').html('Facility #' + $item.FacilityCode + ' - ' + $item.Description).css({ 'font-weight': 'bold', 'font-size': '14px' });
                            let $divFacilityHour = $('<div />').html($item.FacilityHour.replace(/\\n/gi, '<br />'));
                            $('div#facilityName').html($divTitle);
                            $('div#facilityName').append($divFacilityHour);
                        });
                    } else if (Number($item.Latitude) === 0 && $item.StreetAddress !== '') {
                        $this.marksAddress(maps, $item, infowindow);
                    } else if (Number($item.Latitude) !== 0) {
                        $this.marksLonLat(maps, $item, infowindow);
                    }
                    if (infowindow !== undefined)
                        $this._infoWindows.push(infowindow);
                });
                Sana.UI.LoadingIndicator.hide();
            },
            Polygon: function (maps, $item) {
                //var $this = this;
                //var triangleCoords = [];
                //$.each($this._polygonLngLat2, function (i, item) {
                //    triangleCoords.push(item);
                //    $this.Testss(maps, $item, triangleCoords);
                //});
                
            },
            Polygon2: function (maps, triangleCoords) {
                var flightPath = new google.maps.Polyline({
                    path: triangleCoords,
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2
                });
                flightPath.setMap(maps);
                this._polygon.push(flightPath);
            },
            //Load all marks with the address
            marksAddress: function (maps, $item, infowindow) {
                var $this = this;
                GMaps.geocode({
                    address: $item.StreetAddress + ', ' + $item.City + ', ' + $item.State + ', ' + $item.ZipCode,
                    callback: function (results, status) {
                        if (status === 'OK') {
                            var icono = '';
                            var latlng = results[0].geometry.location;
                            var uluru = new google.maps.LatLng(parseFloat(latlng.lat()), parseFloat(latlng.lng()));
                            if (Number($item.Ocuppancy) > 80.00) {
                                icono = '/content/files/images/blue.png';
                            } else {
                                icono = '/content/files/images/red.png';
                            }
                            var marker = new google.maps.Marker(
                                {
                                    position: uluru,
                                    title: $item.FacilityCode,
                                    icon: icono,
                                    map: maps
                                });
                            marker.addListener('click', function (e) {
                                for (var i = 0; i < $this._infoWindows.length - 1; i++) {
                                    $this._infoWindows[i].close();
                                }
                                alert(1);
                                if ($.trim($item.PoligonPoints) !== '') {
                                    if ($this.fields.facilityCode !== $item.FacilityCode) {
                                        let $divTitle = $('<div />').html('Facility #' + $item.FacilityCode + ' - ' + $item.Description).css({ 'font-weight': 'bold', 'font-size': '14px' });
                                        let $divFacilityHour = $('<div />').html($item.FacilityHour.replace(/\\n/gi, '<br />'));
                                        $('div#facilityName').html($divTitle);
                                        $('div#facilityName').append($divFacilityHour);
                                        Sana.Facility.findMarkViewPolygon($item.FacilityCode);
                                        $this.fields.facilityCode = $item.FacilityCode;
                                    } else {
                                        $('div#facilityName').html('');
                                        $this.fields.facilityCode = "";
                                    }
                                } else {
                                    let $divTitle = $('<div />').html('Facility #' + $item.FacilityCode + ' - ' + $item.Description).css({ 'font-weight': 'bold', 'font-size': '14px' });
                                    $('div#facilityName').html($divTitle);
                                    $this.loadItems(e, $item.FacilityCode);
                                    infowindow.open(maps, marker);
                                }
                            });
                            Facility._markers.push(marker);
                        }
                    }
                });
            },
            //Load all marks with the longitud and latitud
            marksLonLat: function (maps, $item, infoWindow) {
                var $this = this;
                var $lat = parseFloat($item.Latitude);
                var $lng = parseFloat($item.Longitude);
                var uluru = { lat: $lat, lng: $lng };
                if (Number($item.Ocuppancy) > 80.00) {
                    icono = '/content/files/images/blue.png';
                } else {
                    icono = '/content/files/images/red.png';
                }
                var marker = new google.maps.Marker(
                    {
                        position: uluru,
                        title: 'Facility #' + $item.FacilityCode + ' - ' + $item.Description,
                        icon: icono,
                        map: maps
                    });
                marker.addListener('click', function (e) {
                    for (var i = 0; i < $this._infoWindows.length - 1; i++) {
                        $this._infoWindows[i].close();
                    }
                    if ($.trim($item.PoligonPoints) !== '') {
                        if ($this.fields.facilityCode !== $item.FacilityCode) {
                            let $divTitle = $('<div />').html('Facility #' + $item.FacilityCode + ' - ' + $item.Description).css({ 'font-weight': 'bold', 'font-size': '14px' });
                            let $divFacilityHour = $('<div />').html($item.FacilityHour.replace(/\\n/gi, '<br />'));
                            $('div#facilityName').html($divTitle);
                            $('div#facilityName').append($divFacilityHour);
                            Sana.Facility.findMarkViewPolygon($item.FacilityCode);
                            $this.fields.facilityCode = $item.FacilityCode;
                        } else {
                            $('div#facilityName').html('');
                            $this.fields.facilityCode = "";
                        }
                    } else {
                        let $divTitle = $('<div />').html('Facility #' + $item.FacilityCode + ' - ' + $item.Description).css({ 'font-weight': 'bold', 'font-size': '14px' });
                        let $divFacilityHour = $('<div />').html($item.FacilityHour.replace(/\\n/gi, '<br />'));
                        $('div#facilityName').html($divTitle);
                        $('div#facilityName').append($divFacilityHour);
                        $this.loadItems(e, $item.FacilityCode);
                        infoWindow.open(maps, marker);
                    }
                });
                $this._markers.push(marker);
            },
            //Clear all marks
            clearMap: function ($mapid) {
                $mapid.html('');
                this.clearItems();
            },
            //clear all fields in the items
            clearItems: function () {
                this._this.find('#FacilityGrid').empty().remove();
                this._itemClass.attr('class', 'itemClass');
                this._itemClass.find('#permitN').html('');
                this._boolAddToCart = false;
            },
            initializeDates: function (initial) {
                $this = this;
                var $datef = this._this.find('.date-cal');
                var $datef2 = this._this.find('.date-select');
                var $selectDate = $datef2.find('select[name=StartDateSelect]');
                $selectDate.html($('<option />', { selected: true }).html(''));
                if (this._startDate.datepicker().length > 0) {
                    this._startDate.datepicker('destroy');
                }
                if (this._endDate.datepicker().length > 0) {
                    this._endDate.datepicker('destroy');
                }
                if (!this.fields.meterRental) {
                    $datef.css('display', 'none');
                    $datef2.removeAttr('style');
                    Facility._startDateSelect.html($('<option />', { selected: true, disable: true }).html(""));
                    var $dateCollection = this._frequency.DateCollection;
                    if (Facility._startDateSelect._selectmenu().length > 0)
                        Facility._startDateSelect._selectmenu('destroy');
                    $.each($dateCollection, function ($i, $item) {
                        Facility._startDateSelect.append($('<option />', { value: moment($item.Date).format('MM/DD/YYYY') }).html(moment($item.Date).format('LL')));
                    });
                    Facility._startDateSelect._selectmenu();
                } else {
                    $datef2.css('display', 'none');
                    $datef.removeAttr('style');
                    this._startDate.datepicker({
                        changeMonth: true,
                        changeYear: true,
                        minDate: 0,
                        onSelect: function () {
                            Sana.UI.LoadingIndicator.show();
                            var startDate = $(this).datepicker('getDate');
                            Facility._endDate.datepicker('option', 'minDate', startDate);
                            $this.itemSelectByProductAndDate();
                        }
                    });
                    this._endDate.datepicker({
                        minDate: 0,
                        constrainInput: true,
                        onSelect: function () {
                            $this.itemSelectByProductAndDate();
                        }
                    });
                }
                if (initial) {
                    this._btnAddToCart = this._this.find('button[name=btnAddCart]');
                    this._btnAddToCart.click(function () {
                        $this.addToCart();
                    });
                    this._btnWaitingList = this._this.find('button[name=waitingList]');
                    this._btnWaitingList.click(function () {
                        $this.waitingList();
                    });
                    this.formWaitingList = this._this.find('form#formWaitingList');
                    this.formWaitingList.submit(function (e) {
                        $this.fWaitingList(e);
                    });
                }
            },
            initializeQuantity: function () {
                $this = this;
                this._quantity._spinner({ min: 1 });
                var $quantity = this._quantity.parents('.tbx-quantity:first');
                var $spinnerUp = $quantity.find('a.ui-spinner-up');
                var $spinnerDown = $quantity.find('a.ui-spinner-down');
                $spinnerUp.attr({ 'class': 'ui-button ui-widget ui-spinner-button ui-spinner-up btn no-caption ui-button-icon-only', style: '' });
                $spinnerDown.attr({ 'class': 'ui-button ui-widget ui-spinner-button ui-spinner-down btn no-caption ui-button-icon-only', style: '' });
                $spinnerUp.find('span:first').attr('class', 'ui-button-icon ui-icon icon-up');
                $spinnerDown.find('span:first').attr('class', 'ui-button-icon ui-icon icon-down');
                this._quantity.change(function (e) {
                    $this.changeQuantity(e.target);
                });
                this._quantity.trigger('change');
                this._quantity.keypress(function (e) {
                    if (e.keyCode === 13) {
                        $this._quantity.trigger('change');
                    }
                });
                $spinnerUp.click(function () {
                    $this._quantity.trigger('change');
                });
                $spinnerDown.click(function () {
                    $this._quantity.trigger('change');
                });
            },
            changeQuantity: function ($_this) {
                var $this = this;
                $_this = $($_this);
                var x = 0;
                var $permitN = this._itemClass.find('div#permitN');
                var $plates = $permitN.find('input[name*=plates]');
                var $quantity = $plates.length;
                if ($_this.val() > this.fields.itemQtyAvailable) {
                    $_this.val($quantity);
                }
                if ($_this.val() === 0 || $_this.val() === '') {
                    $_this.val(1);
                }
                if (this.fields.ePermit && this.fields.itemCategory !== 'Visitor Passes') {
                    if ($plates.length > $_this.val()) {
                        for (x = $plates.length; x > $_this.val(); x--) {
                            $input = $('div#plated-' + x);
                            $input.empty().remove();
                        }
                    } else {
                        for (x = $plates.length; x < Number($_this.val()); x++) {
                            var $input;
                            $formRow = $('<div />', { class: 'form-row', id: 'plated-' + (x + 1) });
                            var $control = $('<div />', { class: 'control' });
                            var $label = $('<div />', { class: 'label', for: 'plate-' + (x + 1) }).html('Plate ' + (x + 1));
                            $input = $('<input />', { type: 'text', id: 'plate-' + (x + 1), name: 'plates', required: true });
                            var $field = $('<div />', { class: 'tbx' }).html($input);
                            var $validation = $('<div />', { id: 'validation' });
                            $control.append($label).append($field).append($validation);
                            $formRow.append($control);
                            $permitN.append($formRow);
                            $input.blur(function (e) {
                                let plates = $('input[name=plates]');
                                for (let i in plates) {
                                    if (plates[i].id !== undefined && plates[i].value !== '') {
                                        if (e.target.id !== plates[i].id) {
                                            if ($.trim(e.target.value).toLowerCase() === $.trim(plates[i].value).toLowerCase()) {
                                                e.target.value = '';
                                                Sana.Message.Alert('The same plate number cannot be included in the same requisition. Contact the MPA customer service to receive more information.', 'Alert!');
                                                return false;
                                            }
                                        }
                                    } else {
                                        break;
                                    }
                                }
                                if (e.target.value) {
                                    var $data = { plate: e.target.value, facility: $this.fields.facilityCode };
                                    $.post(
                                        '/facility/ValidPlate',
                                        $data
                                    ).done(function ($rsl) {
                                        if ($rsl.Error) {
                                            Sana.Message.Alert($rsl.MessageError, 'Alert!');
                                            e.target.value = '';
                                        } else {
                                            if ($rsl.Message !== '') {
                                                Sana.Message.Alert($rsl.Message, 'Alert!');
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
            },
            //load items for select and load dates.
            loadItems: function (e, facilityCode) {
                Sana.UI.LoadingIndicator.show();
                var $mapFacility = this._this.find('.content-facility');
                $mapFacility.addClass('animate');
                $this = this;
                this.clearItems();
                $_this = Facility._this;
                var $productIdWaiting = $_this.find('#itemProductWaiting');
                var $WLGUID = $_this.find('#WLGUID');
                this.fields.facilityCode = facilityCode;
                $this._itemSelected.removeAttr('style');
                var $data = this.formFacility.serializeArray();
                $data.push({ name: 'facilityCode', value: facilityCode });
                if ($productIdWaiting.length > 0) {
                    $data.push({ name: 'productIdWaiting', value: $productIdWaiting.val() });
                }
                if ($WLGUID.length > 0) {
                    $data.push({ name: 'WLGUID', value: $WLGUID.val() });
                }
                if ($this._searchService.val() !== '') {
                    $data.push({ name: 'productId', value: $this._searchService.val() });
                }
                $.post(
                    this.formFacility.attr('action'),
                    $data
                ).done(function (data) {
                    var $gridFacility = $this._this.find('div.gridFacility');
                    $gridFacility.html(data);
                    Facility._itemClass.attr('class', 'itemClass');
                    Sana.Facility.findParkingGrid($gridFacility);
                });
            },
            //select click on date (startDate, endDate)
            itemSelectByProductAndDate: function () {
                $this = this;
                var $error = false;
                if (this.fields.meterRental) {
                    if (this._startDate.val() === '') {
                        Sana.Message.Error(this._startDate.parents('.control:first'), '#validation', 'Start date is required.');
                        $error = true;
                    } else {
                        Sana.Message.Hiden(this._startDate.parents('.control:first'), '#validation');
                    }
                    if (this._endDate.val() === '') {
                        Sana.Message.Error(this._endDate.parents('.control:first'), '#validation', 'End date is required.');
                        $error = true;
                    } else {
                        Sana.Message.Hiden(this._endDate.parents('.control:first'), '#validation');
                    }
                }
                if (!$error) {
                    var $data = this.formFacilityItems.serializeArray();
                    $data.push(
                        { name: 'facilityCode', value: this.fields.facilityCode },
                        { name: 'itemId', value: this.fields.itemId },
                        { name: 'startDate', value: this._startDate.val() },
                        { name: 'endDate', value: this._endDate.val() },
                        { name: 'waiting', value: this._this.find('#WLGUID').val() },
                        { name: 'frequency', value: this.fields.Frecuency }
                    );
                    $.post(
                        this.formFacilityItems.attr('action'),
                        $data
                    ).done(function (result) {
                        $this._itemSelected.css({ 'display': 'inherit' });
                        var $gridFacility = $this._this.find('#FacilityGrid');
                        var $itemSelect = $gridFacility.find('.selected');
                        var $price = $itemSelect.find('.price');
                        $price.html(result.items[0].ItemValue);
                        var $availability = $this._itemClass.find('#avalibility');
                        $availability.html(result.items[0].ItemQtyAvailable);
                        $this.fields.itemQtyAvailable = parseInt(result.items[0].ItemQtyAvailable);
                        $itemQt = $this.fields.itemQtyAvailable;
                        $this._quantity.attr({ min: 1, max: $itemQt })._spinner({ max: $itemQt }).val('');
                        $this.fields.itemCategory = result.items[0].ItemCategory;
                        $this._productName.html(result.items[0].ItemName);
                        $this.changeQuantity($this._quantity);
                        $this._this.find('#quantitylabel').css('display', 'none');
                        $this._this.find('#quantityInput').removeAttr('style');
                        $this._attributes.empty();
                        if ($this.fields.waiting && $this.fields.itemQtyAvailable === 0) {  //validate quantity or waiting
                            $this._itemClass.find('#d_quantity').css('display', 'none');
                            $this._itemClass.find('#waiting').removeAttr('style');
                            $this._btnAddToCart.css('display', 'none');
                            $this._itemClass.find('div#permitN').css('display', 'none');
                        } else if (!$this.fields.waiting && $this.fields.itemQtyAvailable === 0) {
                            $this._itemClass.find('#d_quantity').css('display', 'none');
                            $this._itemClass.find('#waiting').css('display', 'none');
                            $this._btnAddToCart.css('display', 'none');
                            $this._itemClass.find('div#permitN').css('display', 'none');
                        } else { 
                            $this._itemClass.find('#waiting').css('display', 'none');
                            $this._itemClass.find('#d_quantity').removeAttr('style');
                            $this._btnAddToCart.removeAttr('style');
                            $this._itemClass.find('div#permitN').removeAttr('display', 'none');
                            if ($this.fields.itemCategory === 'Visitor Passes') {
                                $this._itemClass.find('#permitN').html('');
                            }
                            if (result.items[0].Attributes.length > 0)
                                $this.attributesByItem(result.items[0].Attributes);
                        }
                        Sana.UI.LoadingIndicator.hide();
                    });
                } else {
                    Sana.UI.LoadingIndicator.hide();
                }
            },
            attributesByItem: function (attributes) {
                $this = this;
                var $address = '';
                var $listObj = $.grep($this._allFacilities, function ($item, $i) {
                    return $item.FacilityCode === $this.fields.facilityCode;
                });
                $listObj = $listObj[0];
                var $txtRequired = $('#msgRequired');
                this._attributes.prepend($('<h3 />').html('Required documents'));
                $.each(attributes, function ($i, $item) {
                    $name = ($item.Name).replace(/ /gi, '');
                    if ($item.IsRequired === "1") { $item.Name = $item.Name + " (*)"; }
                    $req = Number($item.IsRequired) === 1 ? "required" : "";
                    $inpuType = $item.Type.toLowerCase() === 'attachment' ? 'file' : $item.Type.toLowerCase() === 'checkbox' ? 'checkbox' : $item.Type.toLowerCase() === 'numeric' ? 'number' : $item.Type.toLowerCase() === 'address' ? 'text' : 'text';
                    $classe = $inpuType === 'text' ? 'tbx' : $inpuType === 'number' ? 'tbx' : '';
                    $classesInput = $item.Type.toLowerCase() === 'date' ? 'date' : '';
                    $readOnly = $classesInput === 'date' ? ' readonly="readonly"' : '';
                    $inpt = '<input type="' + $inpuType + '" name="' + $name + '" id="' + $name + '" class="' + $classesInput + '" ' + $req + $readOnly + ' />';
                    $Label = $('<div />', { class: 'label' }).html($('<label />', { for: $name }).html($item.Name));
                    $Input = $('<div />', { class: 'field' }).append($('<div />', { class: $classe }).html($inpt)).append($('<div />', { id: 'validation' }));
                    $formRow = $('<div />', { class: 'form-row' }).html($('<div />', { class: 'control' }).append($Label).append($Input));
                    $this._attributes.append($formRow);
                    if ($classesInput) {
                        $($file.find('input[name=' + $name + ']')).datepicker({ minDate: 0 });
                    }
                    if ($item.Type.toLowerCase() === 'address') {
                        $address = '#attributes  input[name=' + $name + ']';
                    }
                });
                this._attributes.append($txtRequired.html());
                if ($address !== '') {
                    if ($listObj.ZipCode !== '') {
                        $($address).change(function (e) {
                            var $data = {
                                street: e.target.value,
                                city: $listObj.City,
                                stateFL: $listObj.State,
                                zipcode: $listObj.ZipCode
                            };
                            $.post(
                                '/Facility/SmartyStreetsApi',
                                $data
                            ).done(function (rsl) {
                                var $rsl = JSON.parse(rsl.json);
                                if ($rsl.length > 0) {
                                    if ($rsl[0].candidate_index === 0) {
                                        e.target.value = $rsl[0].delivery_line_1;
                                    } else {
                                        Sana.Message.Alert("Please, you address have multiple results", "Alert!");
                                        e.target.value = "";
                                    }
                                } else {
                                    Sana.Message.Alert("Please, enter the address valid", "Alert!");
                                    e.target.value = "";
                                }
                            });
                        });
                    }
                }
            },
            // Add to card - submit
            addToCart: function () {
                $this = this;
                var $data = new FormData();
                var $lst = [];
                $data = this.validateFields($data);
                if (!$this._boolAddToCart) {
                    if (this.fields.billing) {
                        var $endDate = moment(this._startDate.val()).add(1, 'year').add(-1, 'days').format('L');
                        $data.append('billing', this.fields.billing);
                        $data.append('BStartDate', this._startDate.val());
                        if (this.fields.Frecuency === 'annual') {
                            $data.append('BEndDate', $endDate);
                        } else {
                            $data.append('NoEnd', true);
                        }
                    }
                    $lst.push(this.createFields());
                    $data.append("facilityProducts", JSON.stringify($lst));
                    $data.append("__RequestVerificationToken", $(this.formFacilityItems).find('input[name=__RequestVerificationToken]').val());
                    Sana.UI.LoadingIndicator.show();
                    $.ajax({
                        url: '/shop/addproductfacility',
                        cache: false,
                        contentType: false,
                        processData: false,
                        data: $data,
                        type: 'POST'
                    }).done(function (rsl) {
                        if (rsl.Error) {
                            var $message = $('#' + rsl.ErrorMessage);
                            Sana.Message.Alert($message.html(), 'Alert!');
                        }
                        else {
                            if ($this.fields.waitingList !== null) {
                                setTimeout(function () {
                                    window.location.href = "/shop/basket";
                                }, 3000);
                            }
                            ProductDetails.onBasketChanged(rsl);
                        }
                        Sana.UI.LoadingIndicator.hide();
                        $this.clearItems();
                    });
                }
                this._boolAddToCart = false;
            },
            //validate all fields in the button card
            validateFields: function ($data) {
                var $data1 = this.fieldsText($data);
                var $data2 = this.fieldsFile($data1);
                return $data2;
            },
            //select all fields with mark of required for type text
            fieldsText: function ($data) {
                var $fields = this._itemSelected.find('input[type=text]');
                $.each($fields, function ($i, $item) {
                    var $control = $($item).parents('.control');
                    if ($item.id !== 'quantity') {
                        if ($.trim($item.value) === '') {
                            if ($($item).attr('required')) {
                                Sana.Message.Error($control, '#validation', 'This field is required.');
                                $this._boolAddToCart = true;
                            }
                        } else {
                            Sana.Message.Hiden($control, '#validation');
                            if ($item.name !== 'plates')
                                $data.append($item.name, $item.value);
                        }
                    }
                });
                return $data;
            },
            //select all fields with mark of required for type file
            fieldsFile: function ($data) {
                $this = this;
                var $fields = this._itemSelected.find('input[type=file]');
                $.each($fields, function ($i, $file) {
                    var $control = $($file).parents('.control');
                    if ($file.files[0] === undefined || $file.files[0] === null) {
                        if ($($file).attr('required')) {
                            Sana.Message.Error($($file).parents('.control'), '#validation', 'This field is required.');
                            $this._boolAddToCart = true;
                        }
                    } else {
                        Sana.Message.Hiden($control, '#validation');
                        $data.append($file.name, $file.files[0]);
                    }
                });
                return $data;
            },
            //Create JSON with fields
            createFields: function () {
                var $lst = [];
                var $lstPlates = [];
                var diff = 0;
                var $endDate = '';
                var $permitN = this._itemClass.find('div#permitN');
                var $plates = $permitN.find('input[name*=plates]');
                if (this.fields.Frecuency === 'annual' && !this.fields.meterRental) {
                    $endDate = moment(this._startDate.val()).add(1, 'year').add(-1, 'days').format('L');
                } else {
                    $endDate = this._endDate.val();
                }
                if (this.fields.meterRental) {
                    var date1 = moment(this._startDate.datepicker('getDate'));
                    var date2 = moment(this._endDate.datepicker('getDate'));
                    diff = date2.diff(date1, 'days') + 1;
                }
                $.each($plates, function ($y, $p) {
                    $lstPlates.push($p.value);
                });
                var $facilityProducts = {
                    ItemId: this.fields.itemId,
                    Quantity: this._quantity.val(),
                    FacilityCode: this.fields.facilityCode,
                    StartDate: this._startDate.val(),
                    EndDate: $endDate,
                    PermitTypeCode: this.fields.permitTypeCode,
                    Permits: $lstPlates,
                    waitingList: this.fields.waitingList,
                    MeterRental: this.fields.meterRental,
                    MeterRentalDays: diff,
                    MaxQuantity: this._this.find('input[name=quantity]').attr('max')
                };
                return $facilityProducts;
            },
            waitingList: function () {
                $this = this;
                Sana.Address.init();
                var $inputFacility = this._this.find('#Facilities');
                var $waitingDiv = $('.waitingDiv');
                var $divWaitingList = $waitingDiv.find('#waitingList');
                let $formWaitingList = $divWaitingList.find('form#formWaitingList');
                var $formFacilityInput = $formWaitingList.find('input[name*=Facility]');
                var $formFacilityItemProduct = $formWaitingList.find('input[name*=ItemProduct]');
                var $productId = $formWaitingList.find('input#productId');
                var $facilityInput = $formWaitingList.find('input[name*=Facility]');
                var $ZipCodeInput = $formWaitingList.find('input[name*=ZipCode]');
                var $AddressInput = $formWaitingList.find('#Waiting_Address');
                var $CityInput = $formWaitingList.find('#Waiting_City');
                var $StateInput = $formWaitingList.find('#Waiting_State');
                var $CountryInput = $formWaitingList.find('#Waiting_CountryId');
                var $button = $formWaitingList.find('#btnSave');
                Sana.Popup.open($divWaitingList);
                var $listObj = $.grep($this._allFacilities, function ($item, $i) {
                    return $item.FacilityCode === $this.fields.facilityCode;
                });
                var $obj = $listObj[0];
                $facilityInput.val($this.fields.facilityCode);
                $facilityInput.attr('readonly', true);
                $formFacilityItemProduct.val(this._productName.html());
                $productId.val(this.fields.itemId);
                $formFacilityItemProduct.attr('readonly', true);
                Sana.Address.disabledOrEnabledAll($CountryInput, $StateInput, $CityInput, true);
                if ($CountryInput._selectmenu().length > 0)
                    $CountryInput._selectmenu('destroy');
                $CountryInput.val($obj.Country).attr('disabled', true).trigger('change');
                $ZipCodeInput.attr('disabled', true).attr('readonly', true).val($obj.ZipCode);
                if ($StateInput._selectmenu().length > 0)
                    $StateInput._selectmenu('destroy');
                $StateInput.val($obj.State).trigger("change");
                $CityInput.val($obj.City);
                $AddressInput.attr('readonly', true).val($obj.StreetAddress);
                var $email = $formWaitingList.find('input[name*=EmailAddress]');
                var $name = $formWaitingList.find('input[name*=Name]');
                var $phoneNumber = $formWaitingList.find('input[name*=PhoneNumber]');
                $email.val('');
                $name.val('');
                $phoneNumber.val('');
                var customer = $formWaitingList.find('input[name=customer]');
                if (customer[0].value !== "") {
                    $email.val($waitingDiv.find('input[name=custEmail]').val());
                    $name.attr('readonly', true).css('background', '#E0E0E0').val($waitingDiv.find('input[name=custName]').val());
                }
            },
            //form waiting list
            fWaitingList: function (e) {
                e.preventDefault();
                var $this = $(e.target);
                let $divWaitingList = $this.parents('#waitingList');
                var $email = $this.find('input[name*=EmailAddress]');
                var $name = $this.find('input[name*=Name]');
                var $phone = $this.find('input[name*=PhoneNumber]');
                var $error = false;
                var list = [];
                list.push("Name", "EmailAddress", "CountryId", "State", "City", "ZipCode", "Facility", "ItemProduct", "ItemId");
                $.each(list, function ($i, $item) {
                    var $field = $this.find('[name*=' + $item + ']');
                    if ($field.attr('name') !== 'ZipCode' && $field.attr('name') !== 'CityHiden'){
                        if ($field.attr('type') === 'text') {
                            if (!$field.val()) {
                                Sana.Message.Error($field.parents('div.form-row:first'), '.validation', $field.attr('data-val-required'));
                                $error = true;
                            } else {

                                Sana.Message.Hiden($field.parents('div.form-row:first'), '.validation');
                            }
                        }
                    }
                });
                var $listForm = $this.serializeArray();
                if ($error)
                    return false;
                $.post(
                    $this.attr('action'),
                    $listForm
                ).done(function (response) {
                    if ($email.attr('readonly') === undefined) {
                        $name.val('');
                        $phone.val('');
                        $email.val('');
                    }
                    if (!response.Error) {
                        Sana.Message.Alert("Your inscription to the waiting list has been completed successfully. An email will be sent to the email address registered when a space is available in the facility", 'Success!');
                        Sana.Popup.close($divWaitingList);
                    } else {
                        Sana.Message.Alert(response.Message, 'Success!');
                        Sana.Popup.close($divWaitingList);
                    }
                });
            }
        }

        return Facility;
    }

    //load functions
    var Facility = func();

    return {
        findParking: findParking,
        findParkingGrid: findParkingGrid,
        findMarkViewPolygon: findMarkViewPolygon
    };

})();