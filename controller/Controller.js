//express server
var express = require("express");

//scraping tools
var request = require("request");
var cheerio = require("cheerio");

//express router ---> CRUD
var router = express.Router();

var methodOverride = require("method-override");

//require modles
var Article = require("../models/Article.js");
var Note = require("../models/Notes.js");

/*
  ROUTES
*/

//home page
router.get("/", function(req, res){
  res.render("index", {});
})

//scrape the onion site and save to the database
router.get("/scrape", function(req, res){

  //grab body of html with request

  request("https://www.nytimes.com/section/us", function(error, response, html){
    //initialize cheerio (with the html body) with $ for shorthand
    var $ = cheerio.load(html);

    //grab every h2 within an article element tag
    $("article").each(function(i, element){

      var result = {};

      result.url = $(element)
        .children('.story-body')
        .children('.story-link')
        .attr('href');

      result.headline = $(element)
        .children('.story-body')
        .children('.story-link')
        .children('.story-meta')
        .children('.headline') 
        .text();

      result.summary = $(element)
        .children('.story-body')
        .children('.story-link')
        .children('.story-meta')
        .children('.summary')
        .text();

      // TODO: not currently finding the image
      result.photo = $(element)
        .children('.story-body')
        .children('.story-link')
        .children('.wide-thumb')
        .children('.img')
        .attr("src");

      console.log(result.photo);

      var entry = new Article({
        url: result.url,
        headline: result.headline,
        summary: result.summary,
        photo: result.photo
      });

      entry.save(function(err, doc){
        if(err){
          console.log(err);
        } else {
          console.log(doc);
        }
    });
  }); 

  //tell browser scrape is done
  res.send("Scrape Complete");
}); 

//display articles
router.get("/articles", function(req, res){
  Article.find({}).limit(5).populate("note").exec( (error, articles) => {
      if (error) {
        console.log(error);
      } else {
        res.render("articles", {articles});
      }
    });
  });
}); 

/*
  NOTES ROUTES
*/

//route that will post our note to the database
router.post("/articles/:id", function(req, res){
  //create instance of Note model and assign to variable newNote
  var newNote = new Note(req.body);

  //save newNote value to the database
  newNote.save(function(err, doc){
    if (err) {
      console.log(err);
    } else {
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc.id })
      //execute query
      .exec(function(err, doc) {
        if(err) {
          console.log(err);
        } else {
          res.json(doc);
        }
      }) 
    } 
  }) 
})

//route to find the note by the id and delete it
router.get("/articles/note/delete/:id", function(req, res){
  Article.findByIdAndRemove(req.params.id, function(err, note){
    if (err) {
      console.log(err);
    } else {
      console.log("note deleted");
      res.send(200);
    }
  })
}); 

/*
  SAVED ARTICLE ROUTES
*/

//route that will add the article to our saved article list
router.post("/articles/put/:id", function(req, res){
  //use article's ObjectId to find and update the saved status
  Article.update({ "_id": req.params.id }, { "saved": true }, function(error, article){
    if(error){
      console.log(err);
    } else {
      res.send(article);
    }
  })
}) 

//route to get the saved articles
router.get("/saved", function(req, res){
  Article.find({ "saved": true}).populate("note").exec(function(error, articles){
    if (error) {
      console.log(error);
    } else {
      res.render("saved", {articles});
    }
  })
}) 


module.exports = router;
