/* Marginalia  - margin annotation viewer for annotator */

function annotatorMarginalia(user_options) {

  var _t = annotator.util.gettext;
  var _app;

  // default options
  var options = {
    show_update_date: true,
    show_author: false
  };
  $.extend(options, user_options || {});

  // Sets the renderer function for the annotations.
  // Defaults to standard formatting.
  if(options.viewer && typeof options.viewer === 'function'){
    options.viewer = options.viewer;
  } else {
    options.viewer = function(annotation){
      if (annotation.text) {
        return annotator.util.escapeHtml(annotation.text);
      } else {
        return "<i>" + _t('No comment') + "</i>";
      }
    };
  }

  options.outer_element = options.outer_element || '.content';
  options.inner_element = options.inner_element || '.inner';
  options.margin_class = options.margin_class || 'margin-container';

  // Container element for annotator
  var $container = $(options.outer_element);
  // Define marginalia annotation container
  var $margin_container = $('<aside/>').attr({
        class:options.margin_class
      });

  // Marginalia variables
  var marginalia_item_class = 'marginalia-item',
      toggle_id = 'toggle-annotations',
      annotations_list_class = 'annotation-list';

// Easing Function for scroll
// from jQuery Easing Plugin (version 1.3)
// http://gsgd.co.uk/sandbox/jquery/easing/
  jQuery.extend( jQuery.easing,{
    easeInOutExpo: function (x, t, b, c, d) {
      if (t==0) return b;
      if (t==d) return b+c;
      if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
      return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }
  });


  // Object for Marginalia
  // Defined as a object for namespacing references (i.e. marginalia.render)
  var marginalia = {
      start: function (app) {
        _app = app;

        // check for moment.js, used for displaying updated date
        if (typeof(moment) == 'undefined' || typeof moment !== 'function') {
            console.warn(_t("To display annotation updated dates, please " +
               "include moment.js in the page."));
            // disable showing updated dates if moment.js is not available
            options.show_update_date = false;
        }

        var toggle_html ='<span class="fa fa-file-text-o"></span>',
            toggle_attrs = {
              class:'',
              id: toggle_id,
              alt: 'Toggle Annotations',
              title: 'Show Annotations',
              href: '#'
            },
            $toggle = $('<a/>')
              .attr(toggle_attrs) // add attributes to the toggle object
              .hide() // hide the toggle object for now, will show when annotations are loaded
              .html(toggle_html); //add the html to the toggle object

        $container.prepend($margin_container);

        $(".in-page-controls").append($toggle);

        // get the rendered margin container
        $margin_container = $('.'+options.margin_class);

        return true;
      },

      render: function(annotation){
        return options.viewer(annotation);
      },

      // Based on: annotator.ui.tags.editorExtension
      editorExtension: function(e) {
          // The input element added to the Annotator.Editor wrapped in jQuery.
          // Cached to save having to recreate it everytime the editor is displayed.
          var field = null;
          var input = null;

          function stringifyTags(array) {
              return array.join(",");
          }

          function updateField(field, annotation) {
              var value = '';
              if (annotation.tags) {
                  value = stringifyTags(annotation.tags);
              }
              input.val(value);
          }

          function parseTags(string) {
              string = $.trim(string);
              var tags = [];

              if (string) {
                  tags = string.split(',');
              }

              return tags;
          }

          function setAnnotationTags(field, annotation) {
              annotation.tags = parseTags(input.val());
          }

          field = e.addField({
              label: _t('Add tags here separated by commas') + '\u2026',
              load: updateField,
              submit: setAnnotationTags
          });

          input = $(field).find(':input');
      },

      // returns an array of the rendered annotation ids
       get_annotations_array: function(){
        var $highlights = $('.annotator-hl'),
            highlight_group_annotation = '',
            annotations_array = [];

        $highlights.each(function(){
          var $this = $(this),
              this_annotation = $this.data('annotation-id');

          if( highlight_group_annotation !== this_annotation ){
            highlight_group_annotation = this_annotation;
            annotations_array.push(highlight_group_annotation);
          }
        });

        return annotations_array;
      },

      // Returns the annotion in the marginalia list format
      renderAnnotation: function(annotation){
        var text = $('<div/>').attr({
            class:'text'
            }).html(marginalia.render(annotation)),
            controls = [
              '<nav class="controls dropdown">',
                '<a id="drop'+ annotation.id +'" class="dropdown-toggle" href="#" data-toggle="dropdown" aria-haspopup="true" role="button" aria-expanded="false">',
                  '<span class="fa fa-ellipsis-v"></span></a>',
                '<ul id="menu'+ annotation.id +'" class="dropdown-menu" role="menu" aria-labelledby="drop4'+ annotation.id +'">',
                  '<li role="presentation"><a role="menuitem" tabindex="-1" class="btn btn-default btn-edit"><span class="fa fa-pencil"></span> Edit</a></li>',
                  '<li role="presentation"><a role="menuitem" tabindex="-1" class="btn btn-default btn-delete"><span class="fa fa-trash-o"></span> Delete</a></li>',
                '</ul>',
              '</nav>'
            ];

            controls = controls.join('\n');

            $marginalia_item = $('<li/>').attr({
              class:marginalia_item_class,
              'data-annotation-id': annotation.id
            }).append(controls).append(text);

            // display tags if set; based on annotator.ui.tags.viewerExtension
            var tags = marginalia.renderTags(annotation);
            $marginalia_item.append(tags);
            $marginalia_item.append(marginalia.renderFooter(annotation));


        $marginalia_item.on('click.marginalia','.btn-edit',function(event){
          event.preventDefault();
          var offset = $(this).parents(".controls").siblings(".text").offset();

          _app.annotations.update(annotation);
          $(".annotator-editor").css({
            top: offset.top,
            left: offset.left
          });
        })
        .on('click.marginalia','.btn-delete',function(event){
          event.preventDefault();
          var del = confirm("Are you sure you want to permanently delete this annotation?");

          if( del === true){
            _app.annotations['delete'](annotation);
          }
        });
        return $marginalia_item;
      },

      renderTags: function(annotation){
        var tags = '';
        if (annotation.tags && $.isArray(annotation.tags) &&
                                  annotation.tags.length) {
          tags = $('<div/>').addClass('annotator-tags').html(function () {
            return $.map(annotation.tags, function (tag) {
              return '<span class="annotator-tag">' +
                     annotator.util.escapeHtml(tag) + '</span>';
              }).join(', ');
          });
        }
        return tags;
      },

      /**
        * Annotation footer, with update date and author.
        * Date is configurable via show_update_date option, requires
        * moment.js, defaults to true.
        * Author is configruable via show_author, defaults to false.
        */
       renderFooter: function(annotation) {
         if (!options.show_update_date && !options.show_author) { return; }
         var footer = $('<div/>').addClass('annotation-footer');
         // annotations have created and updated, but updated
         // is always set, so just stick with that
         if (options.show_update_date) {
           footer.append($('<span/>').addClass('annotation-updated')
             .html('Updated ' +
               moment(annotation.updated).calendar(null, {
                  sameDay: "[today at] LT",
                  lastDay: '[yesterday at ] LT',
                  lastWeek: '[last] dddd',
                  sameElse: 'MMMM Do, YYYY'
                 })));
                 // display date relative to now; use month day year format
                 // for dates more than a week old
         }
         // when showing both date and author, add connecting text
         if (options.show_update_date && options.show_author) {
           footer.append('<span> | </span>');
         }
         // NOTE: this is designed to look fine with either one or both
         // visible; but we might want additional context when user
         // is displayed without the date
         if (options.show_author) {
           footer.append($('<span/>').addClass('annotation-author')
               .html(annotation.user));
         }
         return footer;
       },


      // Add annotations to the sidebar when loaded
      annotationsLoaded: function(annotations){
        //show toggle object once annotations are loaded
        $("#"+toggle_id).show();

        var $annotaton_list = $('<ul/>').attr({
              class:annotations_list_class
            }),
            $empty = $('<li/>').attr({class:'empty-item'});

          $annotaton_list.append($empty);

        var annotations_array = marginalia.get_annotations_array();
        var $margin_container = $('.'+options.margin_class);

        // Display annotations in the marginalia container
        if(annotations){
          $.each(annotations_array,function(i){
            var id = annotations_array[i],
                annotation = $.grep(annotations, function(e){ return e.id == id; })[0],
                $marginalia_item = marginalia.renderAnnotation(annotation);

            $annotaton_list.append($marginalia_item);
          });
        }
        $margin_container.append($annotaton_list);

        $margin_container.stop().animate({'scrollTop': parseInt($("."+options.margin_class+">.annotation-list").css("padding-top")) - 30 },0);

        // Add class to container to hide marginalia aside
        $container.addClass('margin-container-hide');

        // Initalize on click.marginalia event for annotation highlights
        $('.annotator-hl').on('click.marginalia',function(event){
          marginalia.annotationSelected(event);
        });

        // Initalize on click.marginalia event for Marginalia items
        $('.'+marginalia_item_class).find('.text').on('click.marginalia',function(event){
          marginalia.itemSelected(event);
        });

        // Initalize toggle control for marginalia container
        $('#'+toggle_id).on('click.marginalia',function(event){
          event.preventDefault();
          var $this = $(this);

          if($this.hasClass('active')){
            marginalia.toggle.hide();
            $this.attr({'title':'Show Annotations'});
          }
          else{
            marginalia.toggle.show();
            $this.attr({'title':'Hide Annotations'});
          }
        });

        return true;
      },

      // Add marginalia when annotations are created
      annotationCreated: function(annotation){
        var $marginalia_item = marginalia.renderAnnotation(annotation);

        // Get the index of the annotation in context to its siblings
        var annotations_array = marginalia.get_annotations_array(),
        index = annotations_array.indexOf(annotation.id);

        // Append to annotations list...
        if(index < $('.'+ marginalia_item_class).length){
          $($('.'+annotations_list_class +' .'+ marginalia_item_class)[index]).before($marginalia_item);
        }
        else{
          $('.'+annotations_list_class).append($marginalia_item);
        }

        // highlight created...
        marginalia.onSelected(annotation.id);
        // and show marginalia container.
        marginalia.toggle.show();

        // re-bind annotation/note click to select to apply to the
        // new highlight and margin note
        $('.annotator-hl').on('click.marginalia',function(event){
          marginalia.annotationSelected(event);
        });
        $('.'+marginalia_item_class).find('.text').on('click.marginalia',function(event){
          marginalia.itemSelected(event);
        });

        return true;
      },

      // Remove marginalia when annotations are removed
      beforeAnnotationDeleted: function(annotation){
        var $marginalia_item = $('.'+marginalia_item_class+'[data-annotation-id='+annotation.id+']');
        $marginalia_item.remove();

        return true;
      },

      // Update marginalia when annotations are updated
      annotationUpdated: function(annotation){
        var $marginalia_item = $('.'+marginalia_item_class+'[data-annotation-id='+annotation.id+']'),
            updated_text = marginalia.render(annotation),
            updated_tags = marginalia.renderTags(annotation);

        $marginalia_item.find(".annotator-tags").remove();
        $marginalia_item.find(".text").html(updated_text).after(updated_tags);
        $marginalia_item.find(".annotation-footer").remove();
        $marginalia_item.find(".text").after(marginalia.renderFooter(annotation));

        return true;
      },

      // Toggle functions for the margin container
      toggle: {

        show: function(){
          $container.addClass('margin-container-show');
          $container.removeClass('margin-container-hide');

          $('#'+toggle_id).addClass('active');

          if(!!options.toggle && !!options.toggle.show){
            options.toggle.show();
          }
        },

        hide: function(){
          $container.addClass('margin-container-hide');
          $container.removeClass('margin-container-show');

          $('#'+toggle_id).removeClass('active');

          if(!!options.toggle && !!options.toggle.hide){
            options.toggle.hide();
          }
        }
      },

      // Custom event for when an annotation is selected
      // Highlight the marginalia item associated with the annotation
      annotationSelected: function(event) {
        event.stopPropagation();

        var $annotation_highlight = $(event.target),
            annotation_id = $annotation_highlight.data('annotation-id');

        marginalia.onSelected(annotation_id);
      },

      // On Marginalia item select event
      // Highlight the annotation highlight associated with the item
      itemSelected: function(event){
        event.stopPropagation();

        var $marginalia_item = $(event.target).parents('.' + marginalia_item_class),
            annotation_id = $marginalia_item.data('annotation-id');
        marginalia.onSelected(annotation_id);
      },

      clearHighlights: function(){
        $('.marginalia-item-selected').removeClass('marginalia-item-selected');
        $('.marginalia-annotation-selected').removeClass('marginalia-annotation-selected');
      },

      applyHighlights: function($annotation, $item){
        marginalia.clearHighlights();

        $annotation.addClass('marginalia-annotation-selected');
        $item.addClass('marginalia-item-selected');
      },

      onSelected: function(annotation_id){
        var id = annotation_id,
            $annotation = $('.annotator-hl'+'[data-annotation-id='+id+']'),
            $item = $('.' + marginalia_item_class + '[data-annotation-id=' + id + ']' );

        // Return false if the id is undefined
        if(id === undefined){
          return false;
        }

        // Return false if the item is already selected to prevent
        // jumping to the top when highlighting text.
        if ($item.hasClass("marginalia-item-selected")){
            return false;
        }

        var $margin_container = $('.'+options.margin_class);

        // Scroll to the position of the item
          var cTop = $margin_container.offset().top,
              cScrollTop = $margin_container.scrollTop(),
              top = $item.position().top,
              top2 = $annotation.parents(options.inner_element+'>div');

              // If the annotation is wrapped in a child div,
              // we want to get the postion of that parent element.
              if( top2.length>0 ){
                top2 = top2.position().top;
              }
              // Otherwise, get the top position of the element.
              else{
                top2 = $annotation.position().top;
              }

          $margin_container.stop().animate({'scrollTop':top-top2+30},500,'easeInOutExpo');


        // Highlight selected parts
        marginalia.applyHighlights($annotation, $item);

        // Show marginalia container
        marginalia.toggle.show();

      }
  };
  // return marginalia object
  return marginalia;
}