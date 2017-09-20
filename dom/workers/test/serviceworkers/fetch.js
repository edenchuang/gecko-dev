addEventListener('fetch', function(event) {
  if (event.request.url.indexOf("fail.html") !== -1) {
    event.respondWith(fetch("hello.html", {"integrity": "abc"}));
  } else if (event.request.url.indexOf("fake.html") !== -1) {
    event.respondWith(fetch("hello.html"));
  }

  event.respondWith(fetch(event.request));
});

addEventListener("activate", function(event) {
  event.waitUntil(clients.claim());
});
