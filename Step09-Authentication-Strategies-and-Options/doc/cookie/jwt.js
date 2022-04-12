var express = require("express");
var session = require("cookie-session");
var app = express(); // Use the session middleware
app.use(
  session({
    ////这里的name值得是cookie的name，默认cookie的name是：connect.sid
    //name: 'hhw',
    secret: "keyboard cat",
    cookie:
      ("name",
      "value",
      { path: "/", httpOnly: true, secure: false, maxAge: 60000 }), //重新保存：强制会话保存即使是未修改的。默认为true但是得写上
    resave: true, //强制“未初始化”的会话保存到存储。
    saveUninitialized: true,
  })
);
// 只需要用express app的use方法将session挂载在‘/’路径即可，这样所有的路由都可以访问到session。//可以给要挂载的session传递不同的option参数，来控制session的不同特性
app.get("/", function (req, res, next) {
  var sess = req.session; //用这个属性获取session中保存的数据，而且返回的JSON数据
  console.log(sess.cookie);
  sess.jwt = "rewrwe";
  res.end();
});

app.listen(3002);
