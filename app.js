/**
 * Module dependencies.
 */

// mongoose setup
require('./mongoose-db');
require('./typeorm-db')

var st = require('st');
var crypto = require('crypto');
var express = require('express');
var https = require('https');
var fs = require('fs');
var path = require('path');
var ejsEngine = require('ejs-locals');
var bodyParser = require('body-parser');
var session = require('express-session')
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var optional = require('optional');
var marked = require('marked');
var fileUpload = require('express-fileupload');
var csrf = require('csurf');
var dust = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');
var cons = require('consolidate');
const hbs = require('hbs')

var app = express();
app.disable('x-powered-by');
app.use(function (req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

var routes = require('./routes');
var routesUsers = require('./routes/users.js')

// all environments
app.set('port', process.env.PORT || 3001);
app.engine('ejs', ejsEngine);
app.engine('dust', cons.dust);
app.engine('hbs', hbs.__express);
cons.dust.helpers = dustHelpers;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  name: 'connect.sid',
  cookie: { path: '/', httpOnly: true, sameSite: 'lax', secure: true }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

// These JSON APIs don't rely on the session cookie (credentials, if any, travel
// in the request itself), so CSRF tokens don't apply to them
app.get('/chat', routes.chat.get);
app.put('/chat', routes.chat.add);
app.delete('/chat', routes.chat.delete);
app.use('/users', routesUsers)

// CSRF protection for everything that follows (cookie/session based pages)
app.use(csrf());
app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Routes
app.use(routes.current_user);
app.get('/', routes.index);
app.get('/login', routes.limiter, routes.login);
app.post('/login', routes.limiter, routes.loginHandler);
app.get('/admin', routes.limiter, routes.isLoggedIn, routes.admin);
app.get('/account_details', routes.limiter, routes.isLoggedIn, routes.get_account_details);
app.post('/account_details', routes.limiter, routes.isLoggedIn, routes.save_account_details);
app.get('/logout', routes.logout);
app.post('/create', routes.limiter, routes.create);
app.get('/destroy/:id', routes.destroy);
app.get('/edit/:id', routes.edit);
app.post('/update/:id', routes.update);
app.post('/import', routes.limiter, routes.import);
app.get('/about_new', routes.limiter, routes.about_new);

// Static
app.use(st({ path: './public', url: '/public' }));

// Add the option to output (sanitized!) markdown
marked.setOptions({ sanitize: true });
app.locals.marked = marked;

// development only
if (app.get('env') == 'development') {
  app.use(errorHandler());
}

var token = process.env.APP_TOKEN;

// HTTPS only: refuse to start without a key/certificate pair
if (!process.env.TLS_KEY_PATH || !process.env.TLS_CERT_PATH) {
  console.error('TLS_KEY_PATH and TLS_CERT_PATH must point to a PEM key and certificate; this app only serves HTTPS.');
  process.exit(1);
}

var server = https.createServer({
  key: fs.readFileSync(process.env.TLS_KEY_PATH),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH),
}, app);

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
