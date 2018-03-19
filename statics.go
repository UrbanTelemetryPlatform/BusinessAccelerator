// Copyright 2015 Google Inc. All rights reserved.
// Use of this source code is governed by the Apache 2.0
// license that can be found in the LICENSE file.

// Package static demonstrates a static file handler for App Engine flexible environment.
package main

import (
	"net/http"

	"google.golang.org/appengine"
)

func main() {
	// Serve static files from "static" directory.
	http.Handle("/", http.FileServer(http.Dir("./ui/")))
	appengine.Main()
}
