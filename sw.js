self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return new Response('WhatsApp is working offline');
    })
  );
});
