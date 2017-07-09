# jstracking

The jstracking library is created based on [tracking.js](https://trackingjs.com/)
library, which is a JavaScript library bringing different computer vision
algorithms and techniques into the browser environment.

While, the original tracking.js library is not written in CommonJS or ES6 modules,
which leads to difficulty in using the library in modern ES6 and Node.js
development. The jstracking library solves the problem by rewriting the tracking.js
library in CommonJS modules, so it is totally npm compatible, and can also be
used by Node.js programs. Additionally, all of the tracking.js APIs are kept, so
it's very simple to upgrade any code using tracking.js: just replace
`tracking(-min).js` file.

## Install

Install via [npm](https://www.npmjs.com/), or [download as a zip](https://github.com/JoshuaTang/jstracking/archive/master.zip):

```
npm install jstracking
```

## APIs

The tracking.js library APIs are all kept, so you can refer to
[tracking.js](https://trackingjs.com/) for details.

## New Features

- [ ] Written in CommonJS modules.
- [ ] Auto-scaling option to boost performance, especially for large videos/images.
- [ ] FPS option to set tracking count in one second.

## License

The MIT License  
Copyright (c) 2017 Joshua Tang
