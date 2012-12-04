// TODO: make this less FUCKING SHAMELESSLY HACKY
var globalUser = {};
$.getJSON('/users/current.json', function (userRes) {
    globalUser = userRes;
});

//Geolocation shim, a la 15-237 lecture.
var nop = function(){};
if (!navigator.geolocation) {
    navigator.geolocation = {};
}
if (!navigator.geolocation.getCurrentPosition) {
    navigator.geolocation.getCurrentPosition = nop;
}
//Google autocomplete object. Give it a global scope.
var autocomplete = {};
//The result of the places query. 
var place = {};


//Load newEventPage's scripts when the page is loaded.
$("#newEventPage").live("pageinit", function(e){
    console.log("new event");

    //Refresh the ich template engine.
    ich.refresh();

    //Initialize autocomplete
    autocomplete = new google.maps.places.Autocomplete(document.getElementById("eventLoc"),{
        componentRestrictions: {country: 'us'}
    });

    //Initialize the error/success popups.
    $("#errorPopup").popup({
        overlayTheme: "a",
        transition: "pop"
    });       
    $("#successPopup").popup({
        overlayTheme: "a",
        transition: "pop"
    });

    //Request current data to bias the autocomplete's search queries.
    navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var bnd = 0.3;

        //Set the bounds to be the current location +- bnd.
        var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(lat-bnd, lng-bnd),
            new google.maps.LatLng(lat+bnd, lng+bnd));

        //Pass them bounds to the autocomplete so our search is biased.
        autocomplete.setBounds(bounds);
    });

    //Watch for resolved autocomplete locations
    google.maps.event.addListener(autocomplete, 'place_changed', function(){
        place = autocomplete.getPlace();
    });

    //Bind a verifier to the submit button.
    $("#submitEvent").live("tap", function(){
        var problems = []

        //Verify everything's alright. 
        var name = $("#eventName").val();
        var date = $("#eventDate").val();
        var time = $("#eventTime").val();
        var isPrivate = $("#eventPrivate").val();

        if(name.length < 3){
            problems.push("<li>enter a <i>real</i> name (3+ letters).</li>");
            $("#eventName").addClass("error");
        }

        if(!place.geometry){
            problems.push("<li>enter a <i>valid</i> location.</li>");
            $("#eventLoc").addClass("error");
        }

        if(date === ""){
            problems.push("<li>enter a valid date, please.</li>");
        }

        if(time === ""){
            problems.push("<li>enter a valid time, if you could.</li>");
        }

        if(problems.length >0){
            $("#problems").html(problems.join(""));
            $("#errorPopup").popup("open");
            return;
        } else {
            var lat = place.geometry.location["$a"];
            var lng = place.geometry.location["ab"];
            // TODO: incorporate this into the post data
            // will be done after some location stuff is set up on
            // the server side
            // - Matt

            var dateTime = new Date(date + " " + time + ":00");

            var placeData = {
                name : place.name,
                address : place.formatted_address,
                phoneNumber : place.formatted_phone_number,
                lat : lat,
                lng : lng
            };

            var eventData = {
                name: name,
                description: "",
                startTime: dateTime,
                isPrivate: isPrivate === "on" 
            };

            var reqData = { 
                placeData : placeData,
                eventData : eventData
            };

            // TODO: MAKE THE REQUEST URL DYNAMIC OR SHIT WILL HIT THE FAN IN DEPLOYMENT
            // will take care of this - Matt
            $.post('http://localhost:3000/events/new', reqData, function (data) {
                console.log(data);
                $("#successPopup").bind("popupafterclose", function(){
                    window.location.href = "/events/feed";
                });
                $("#successPopup").popup("open");
            });
        }
    });
});

$("#feedPage").live("pageinit", function(e){

    console.log("feeds");

    //Refresh the ich template engine.
    ich.refresh();

    //Grab the feeds server-side and render them.
    $.getJSON('/events/feed.json', function (data) {
        console.log(data);
        _.each(data, function (hEvent) {
            // used `hEvent` instead of `event` because `event` is a javascript reserved keyword
            if(hEvent.isPrivate === false){
                var eventLi = ich.eventItem({
                    user_name: hEvent.ownerName,
                    event_name: hEvent.name,
                    event_url: "http://localhost:3000/events/" + hEvent._id
                });
                $("#feedList").append(eventLi).listview('refresh'); 
            }

        });
        console.log("Feeds Loaded");
    });
});

$("#viewEventPage").live("pageinit", function (e) {
    var eventId = window.location.pathname.split('/').pop();
    $.getJSON('/events/' + eventId + '.json', function (eventRes) {
        console.log(eventRes);
        var templated = ich.eventView({
            event: eventRes,
            startTime: new Date(eventRes.startTime)
        });
        $("#viewContent").append(templated);
    });
});