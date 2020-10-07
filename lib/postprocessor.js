/* eslint-disable array-callback-return */
var path = require('path');
var xml2js = require('xml2js');
var xpath = require('xml2js-xpath');
var extend = require('util')._extend;

var postprocessor = {
  /**
   * Execute preprocessor on main, and embedded document
   * @param  {Object}   report
   */
  execute : function (report, callback) {
    if (report === null || report.files === undefined) {
      return callback(null, report);
    }
    for (var i = -1; i < report.embeddings.length; i++) {
      var _mainOrEmbeddedTemplate = report.filename;
      var _fileType = report.extension;
      if (i > -1) {
        // If the current template is an embedded file

        _fileType = path
          .extname(_mainOrEmbeddedTemplate)
          .toLowerCase()
          .slice(1);
      }
      switch (_fileType) {
        case 'odt':
          postprocessor.replaceImageODT(report);
          break;
        case 'docx':
          postprocessor.replaceImageDocx(report);
          break;
        default:
          break;
      }
    }
    return callback(null, report);
  },

  /**
   * Pre-process image replacement in Docx template
   * Find all media files and replace the value of dummy images for the carbone tag when it exists. In that case only mark the media file as isMarked to be searched for tags
   *
   * @param  {Object} report (modified)
   * @return {Object}          template
   */
  replaceImageDocx : function (report) {
    let document = report.files.find((x) => x.name === 'word/document.xml');
    let state = [];

    xml2js.parseString(document.data, (err, result) => {
      // Find all pic tags in file
      var matches = xpath.find(result, '//pic:pic');

      // For each match
      matches.map((match) => {
        // Find the description tag
        let definition = xpath.find(
          xpath.find(match, '//pic:nvPicPr')[0],
          '//pic:cNvPr'
        )[0].$;
        let fullUrl = definition.descr;

        // Get the relation element
        let relationId = xpath.find(
          xpath.find(match, '//pic:blipFill')[0],
          '//a:blip'
        )[0].$['r:embed'];

        // Get the relation node in relations document
        let relationNode = report.files.find((x) =>
          x.name.includes('word/_rels/document.xml.rels')
        );

        // Parse the relation document
        xml2js.parseString(relationNode.data, (err, relationMatch) => {

          // Get all relations
          var relations = xpath.find(relationMatch, '//Relationships');

          // Get the relation with our id
          var relation = xpath
            .find(relationMatch, '//Relationships/Relationship')
            .find((x) => x.$.Id === relationId);
          let relationState = state.find((x) => x.key === relationId);

          // If it as a tag in description and its not the first iteration
          if (relationState && fullUrl) {
            relationState.number += 1;

            // Get the media of the relation
            let media = report.files.find(
              (x) => x.name === 'word/' + relation.$.Target
            );

            // Get the corresponding relation node
            let rel = relations[0].Relationship.find(
              (x) => x.$.Id === relationId && x.$.Target === relation.$.Target
            );

            // Copy the relation and change media values
            let newRel = {};
            var name = relation.$.Target.split('.').join(
              relationState.number + '.'
            );
            newRel.$ = extend({}, rel.$);
            newRel.$.Id = relationId + '_' + relationState.number;
            newRel.$.Target = name;
            relationMatch.Relationships.Relationship.push(newRel);

            // Build the new relation document node
            let builder = new xml2js.Builder();
            relationNode.data = builder.buildObject(relationMatch);

            xml2js.parseString(document.data, (err, result) => {

              // Find all pics
              var pics = xpath.find(result, '//pic:pic');

              // Find out working pic
              let pic = pics.find(
                (x) =>
                  xpath.find(
                    xpath.find(x, '//pic:nvPicPr')[0],
                    '//pic:cNvPr'
                  )[0].$.descr === fullUrl
              );

              // Get the blip where the relation is setted and replace him by the new relation
              let blip = pic['pic:blipFill'][0]['a:blip'][0];
              blip.$['r:embed'] =
                blip.$['r:embed'] + '_' + relationState.number;
              document.data = builder.buildObject(result);

              // Extend the media
              let newMedia = extend({}, media);
              newMedia.name = 'word/' + name;
              newMedia.data = fullUrl;

              // Remove the processed url for a inoquos relation tag
              document.data = document.data
                .split(fullUrl)
                .join(relationId + '_' + relationState.number);

              // Add the new media to report files
              report.files.push(newMedia);
            });
          }
          // If has tag and its first iteration
          else if (fullUrl) {
            state.push({ key : relationId, number : 1 });

            // Find the media of the picture
            let media = report.files.find(
              (x) => x.name === 'word/' + relation.$.Target
            );

            // Remove the processed url for a inoquos relation tag
            document.data = document.data.split(fullUrl).join(relationId);

            // Change the mock media binary data for the url (will be replaced in files.js by the binary)
            media.data = fullUrl;
          }
        });
      });
    });

    return report;
  },

  /**
   * Pre-process image replacement in ODT template
   * Find all media files and replace the value of dummy images for the carbone tag when it exists. In that case only mark the media file as isMarked to be searched for tags
   *
   * @param  {Object} template (modified)
   * @return {Object}          template
   */
  replaceImageODT : function (template) {
    let document = template.files.find((x) => x.name === 'content.xml');

    xml2js.parseString(document.data, (err, result) => {
      var matches = xpath.find(result, '//draw:frame');

      matches.map((match, index) => {
        let desc = match['svg:desc'];
        if (desc) {
          xpath.find(match, '//draw:image')[0].$['xlink:href'] = undefined;
          xpath.find(match, '//draw:image')[0].$['loext:mime-type'] = undefined;

          let url = desc[0];
          desc[0] = index;

          xpath.find(match, '//draw:image')[0]['office:binary-data'] = [url];

          let builder = new xml2js.Builder();
          document.data = builder.buildObject(result);

        }
      });
    });

    return template;
  },
};

module.exports = postprocessor;
