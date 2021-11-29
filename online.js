(function () {
    'use strict';

    var network$1 = new Lampa.Reguest();
    var token$1 = '3i40G5TSECmLF77oAqnEgbx61ZWaOYaE';
    var object$1 = {};
    var extract = {};

    function search$1(_object, success, empty, error) {
      object$1 = _object;
      var url = 'https://videocdn.tv/api/';
      var query = object$1.movie.imdb_id || object$1.search;

      if (object$1.movie.original_language == 'ja' && isAnime(object$1.movie.genres)) {
        url += object$1.movie.number_of_seasons ? 'anime-tv-series' : 'animes';
      } else {
        url += object$1.movie.number_of_seasons ? 'tv-series' : 'movies';
      }

      url = Lampa.Utils.addUrlComponent(url, 'api_token=' + token$1);
      url = Lampa.Utils.addUrlComponent(url, 'query=' + encodeURIComponent(query));
      url = Lampa.Utils.addUrlComponent(url, 'field=global');
      if (object$1.movie.release_date && object$1.movie.release_date !== '0000') url = Lampa.Utils.addUrlComponent(url, 'year=' + (object$1.movie.release_date + '').slice(0, 4));
      network$1.silent(url, function (json) {
        if (json.data && json.data.length) {
          if (json.data.length == 1 || object$1.clarification) {
            success(json.data);
            extractData(json.data);
          } else {
            empty(json.data.map(function (e) {
              return e.ru_title;
            }));
          }
        } else empty();
      }, function (a, c) {
        error(network$1.errorDecode(a, c));
      });
    }

    function isAnime(genres) {
      return genres.filter(function (gen) {
        return gen.id == 16;
      }).length;
    }

    function extractFile(str, max_quality) {
      var url = '';

      try {
        var items = str.split(',').map(function (item) {
          return {
            quality: parseInt(item.match(/\[(\d+)p\]/)[1]),
            file: item.replace(/\[\d+p\]/, '').split(' or ')[0]
          };
        });
        items.sort(function (a, b) {
          return b.quality - a.quality;
        });
        url = items[0].file;
        url = 'http:' + url.slice(0, url.lastIndexOf('/')) + '/' + (max_quality || items[0].quality) + '.mp4';
      } catch (e) {}

      return url;
    }

    function extractData(results) {
      network$1.timeout(5000);
      var movie = results.slice(0, 1)[0];
      extract = {};

      if (movie) {
        var src = movie.iframe_src;
        network$1["native"]('http:' + src, function (raw) {
          var math = raw.replace(/\n/g, '').match(/id="files" value="(.*?)"/);

          if (math) {
            var json = Lampa.Arrays.decodeJson(math[1].replace(/&quot;/g, '"'), {});
            var text = document.createElement("textarea");

            var _loop = function _loop(i) {
              var _movie$media, _movie$media$filter$;

              if (0 === i - 0) {
                return "continue";
              }

              text.innerHTML = json[i];
              Lampa.Arrays.decodeJson(text.value, {});
              var max_quality = (_movie$media = movie.media) === null || _movie$media === void 0 ? void 0 : (_movie$media$filter$ = _movie$media.filter(function (obj) {
                return obj.translation_id === i - 0;
              })[0]) === null || _movie$media$filter$ === void 0 ? void 0 : _movie$media$filter$.max_quality;

              if (!max_quality) {
                var _movie$translations, _movie$translations$f;

                max_quality = (_movie$translations = movie.translations) === null || _movie$translations === void 0 ? void 0 : (_movie$translations$f = _movie$translations.filter(function (obj) {
                  return obj.id === i - 0;
                })[0]) === null || _movie$translations$f === void 0 ? void 0 : _movie$translations$f.max_quality;
              }

              extract[i] = {
                json: Lampa.Arrays.decodeJson(text.value, {}),
                file: extractFile(json[i], max_quality)
              };

              for (var a in extract[i].json) {
                var elem = extract[i].json[a];

                if (elem.folder) {
                  for (var f in elem.folder) {
                    var folder = elem.folder[f];
                    folder.file = extractFile(folder.file, max_quality);
                  }
                } else elem.file = extractFile(elem.file, max_quality);
              }
            };

            for (var i in json) {
              var _ret = _loop(i);

              if (_ret === "continue") continue;
            }
          }
        }, false, false, {
          dataType: 'text'
        });
      }
    }

    function getFile$1(element, max_quality, show_error) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';

      if (translat) {
        if (element.season) {
          for (var i in translat.json) {
            var elem = translat.json[i];

            if (elem.folder) {
              for (var f in elem.folder) {
                var folder = elem.folder[f];

                if (folder.id == id) {
                  file = folder.file;
                  break;
                }
              }
            } else if (elem.id == id) {
              file = elem.file;
              break;
            }
          }
        } else {
          file = translat.file;
        }
      }

      max_quality = parseInt(max_quality);

      if (file) {
        if (file.split('/').pop().replace('.mp4', '') !== max_quality) {
          file = file.slice(0, file.lastIndexOf('/')) + '/' + max_quality + '.mp4';
        }
      } else if (show_error) Lampa.Noty.show('Не удалось извлечь ссылку');

      return file;
    }

    function filter$1(params) {
      var filter_items = params.filter_items;
      var select_season = params.select_season;
      params.results.slice(0, 1).forEach(function (movie) {
        if (movie.season_count) {
          var s = movie.season_count;

          while (s--) {
            filter_items.season.push('Сезон ' + (movie.season_count - s));
          }

          filter_items.choice.season = typeof select_season == 'undefined' ? filter_items.season.length - movie.season_count : select_season;
        }

        if (filter_items.season.length) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == filter_items.choice.season + 1) {
              episode.media.forEach(function (media) {
                if (filter_items.voice.indexOf(media.translation.smart_title) == -1) {
                  filter_items.voice.push(media.translation.smart_title);
                  filter_items.voice_info.push({
                    id: media.translation.id
                  });
                }
              });
            }
          });
        } else {
          movie.translations.forEach(function (element) {
            filter_items.voice.push(element.smart_title);
            filter_items.voice_info.push({
              id: element.id
            });
          });
        }
      });
    }

    function filtred$1(results, filter_items) {
      var filtred = [];
      var filter_data = Lampa.Storage.get('online_filter', '{}');

      if (object$1.movie.number_of_seasons) {
        results.slice(0, 1).forEach(function (movie) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == filter_data.season + 1) {
              episode.media.forEach(function (media) {
                if (media.translation.id == filter_items.voice_info[filter_data.voice].id) {
                  filtred.push({
                    episode: parseInt(episode.num),
                    season: episode.season_num,
                    title: episode.num + ' - ' + episode.ru_title,
                    quality: media.max_quality + 'p',
                    translation: media.translation_id
                  });
                }
              });
            }
          });
        });
      } else {
        results.slice(0, 1).forEach(function (movie) {
          movie.media.forEach(function (element) {
            if (filter_items.voice_info[filter_data.voice].id == element.translation_id) {
              filtred.push({
                title: element.translation.title,
                quality: element.max_quality + 'p',
                translation: element.translation_id
              });
            }
          });
        });
      }

      return filtred;
    }

    function append$1(params) {
      params.items.forEach(function (element) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object$1.movie.original_title].join('') : object$1.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online', element);
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));
        item.on('hover:enter', function () {
          if (object$1.movie.id) Lampa.Favorite.add('history', object$1.movie, 100);
          var file = getFile$1(element, element.quality, true);

          if (file) {
            params.open();
            var playlist = [];
            var first = {
              url: file,
              timeline: view,
              title: element.season ? element.title : object$1.movie.title + ' / ' + element.title
            };
            Lampa.Player.play(first);

            if (element.season) {
              params.items.forEach(function (elem) {
                playlist.push({
                  title: elem.title,
                  url: getFile$1(elem, elem.quality),
                  timeline: elem.timeline
                });
              });
            } else {
              playlist.push(first);
            }

            Lampa.Player.playlist(playlist);
          }
        });
        params.item(item);
        params.scroll.append(item);
      });
    }

    var videocdn = {
      search: search$1,
      filter: filter$1,
      filtred: filtred$1,
      append: append$1
    };

    var network = new Lampa.Reguest();
    var token = '2d55adfd-019d-4567-bbf7-67d503f61b5a';
    var object = {};
    var translates = [];

    function search(_object, success, empty, error) {
      object = _object;
      var url = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(object.search) + '&page=1';
      network.silent(url, function (json) {
        if (json.films && json.films.length) {
          var film_id = json.films[0].filmId;
          network.timeout(10000);
          network["native"]('https://voidboost.net/embed/' + film_id, function (str) {
            extractTranslates(str, function (list) {
              translates = list;

              if (translates.length) {
                var elements = [];
                translates.forEach(function (voice) {
                  elements.push({
                    title: object.movie.title,
                    file: voice.file,
                    quality: '720p / 1080p',
                    voice_id: voice.id
                  });
                });
                success(elements);
              } else empty();
            });
          }, empty, false, {
            dataType: 'text'
          });
        } else empty();
      }, function (a, c) {
        error(network.errorDecode(a, c));
      }, false, {
        headers: {
          'X-API-KEY': token
        }
      });
    }

    function getFile(id, success, error) {
      network.timeout(3000);
      network["native"]('https://voidboost.net/movie/' + id + '/iframe?h=gidonline.io', function (str) {
        var videos = str.match("file': '(.*?)'");

        if (videos) {
          var link = videos[0].match("1080p](.*?)mp4");

          if (link) {
            success(link[1] + 'mp4');
          } else error();
        } else error();
      }, error, false, {
        dataType: 'text'
      });
    }

    function extractTranslates(str, call) {
      var trsl = str.match('<select name="translator"[^>]+>(.*?)</select>');

      if (trsl) {
        var select = $('<select>' + trsl[1] + '</select>');
        var list = [];
        $('option', select).each(function () {
          var id = $(this).attr('data-token');

          if (id) {
            list.push({
              id: id,
              name: $(this).text(),
              file: ''
            });
          }
        });
        var point = 0;

        var scan = function scan() {
          if (point >= list.length) return call(list);
          var voice = list[point];
          getFile(voice.id, function (file) {
            voice.file = file;
            scan();
          }, scan);
          point++;
        };

        scan();
      } else call([]);
    }

    function filter(params) {
      var filter_items = params.filter_items;
      translates.forEach(function (tranlate) {
        filter_items.voice.push(tranlate.name);
        filter_items.voice_info.push({
          id: tranlate.id
        });
      });
    }

    function filtred(results, filter_items) {
      var filter_data = Lampa.Storage.get('online_filter', '{}');
      var filtred = results.filter(function (elem) {
        return elem.voice_id == filter_items.voice_info[filter_data.voice].id;
      });
      return filtred;
    }

    function append(params) {
      params.items.forEach(function (element) {
        var hash = Lampa.Utils.hash(object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online', element);
        item.append(Lampa.Timeline.render(view));
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          params.open();
          var first = {
            url: element.file,
            timeline: view,
            title: element.title
          };
          Lampa.Player.play(first);
        });
        params.item(item);
        params.scroll.append(item);
      });
    }

    var rezka = {
      search: search,
      filter: filter,
      filtred: filtred,
      append: append
    };

    function component(object) {
      var sources = {
        videocdn: videocdn,
        rezka: rezka
      };
      var network = new Lampa.Reguest();
      var scroll = new Lampa.Scroll({
        mask: true,
        over: true
      });
      var files = new Lampa.Files(object);
      var filter = new Lampa.Filter(object);
      var results = [];
      var filtred = [];
      var balanser = 'videocdn'; //Lampa.Storage.get('online_balanser','videocdn')

      var last;
      var last_filter;
      var filter_items = {
        season: [],
        voice: [],
        voice_info: [],
        choice: {}
      };
      var filter_translate = {
        season: 'Сезон',
        voice: 'Перевод'
      };
      scroll.minus();
      scroll.body().addClass('torrent-list');

      this.create = function () {
        var _this = this;

        this.activity.loader(true);
        Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie));

        filter.onSearch = function (value) {
          Lampa.Activity.replace({
            search: value,
            clarification: true
          });
        };

        filter.onBack = function () {
          _this.start();
        };

        this.balanser();
        filter.render().find('.selector').on('hover:focus', function (e) {
          last_filter = e.target;
        });
        filter.render().find('.filter--sort').remove();
        this.search();
        return this.render();
      };

      this.balanser = function () {
        var _this2 = this;

        var source = $('<div class="simple-button simple-button--filter selector"><span>Источник</span><div>' + balanser + '</div></div>');
        source.on('hover:enter', function () {
          Lampa.Select.show({
            title: 'Источник',
            items: [{
              title: 'Videocdn',
              source: 'videocdn',
              selected: balanser == 'videocdn'
            }, {
              title: 'HDRezka',
              source: 'rezka',
              selected: balanser == 'rezka'
            }],
            onBack: _this2.start,
            onSelect: function onSelect(a) {
              scroll.render().find('.online,.empty').remove();
              balanser = a.source;
              Lampa.Storage.set('online_balanser', a.source);
              source.find('div').text(a.source);

              _this2.search();

              _this2.start();
            }
          });
        });
        filter.render().append(source);
      };

      this.search = function () {
        var _this3 = this;

        this.activity.loader(true);
        sources[balanser].search(object, function (data) {
          results = data;

          _this3.build();

          _this3.activity.loader(false);

          _this3.activity.toggle();
        }, function (similars) {
          if (similars) {
            _this3.empty('Найдено несколько похожих вариантов, уточните нужный', similars);
          } else _this3.empty('Ой, мы не нашли (' + object.search + ')', similars);
        }, function (e) {
          _this3.empty('Ответ: ' + e);
        });
      };

      this.empty = function (descr, similars) {
        var empty = new Lampa.Empty({
          descr: descr
        });

        if (files.render().find('.scroll__content').length) {
          this.listEmpty();
          this.start();
        } else {
          files.append(empty.render(similars ? filter.similar(similars) : filter.empty()));
          this.start = empty.start;
        }

        this.activity.loader(false);
        this.activity.toggle();
      };

      this.buildFilter = function (select_season) {
        var select = [];

        var add = function add(type, title) {
          var need = Lampa.Storage.get('online_filter', '{}');
          var items = filter_items[type];
          var subitems = [];
          var value = need[type];
          items.forEach(function (name, i) {
            subitems.push({
              title: name,
              selected: value == i,
              index: i
            });
          });
          select.push({
            title: title,
            subtitle: items[value],
            items: subitems,
            stype: type
          });
        };

        filter_items.voice = [];
        filter_items.season = [];
        filter_items.voice_info = [];
        filter_items.choice = {
          season: 0,
          voice: 0
        };
        sources[balanser].filter({
          results: results,
          filter_items: filter_items,
          select_season: select_season
        });
        Lampa.Storage.set('online_filter', object.movie ? filter_items.choice : {});
        select.push({
          title: 'Сбросить фильтр',
          reset: true
        });

        if (object.movie) {
          add('voice', 'Перевод');
          if (object.movie.number_of_seasons) add('season', 'Сезон');
        }

        filter.set('filter', select);
        this.selectedFilter();
      };

      this.selectedFilter = function () {
        var need = Lampa.Storage.get('online_filter', '{}'),
            select = [];

        for (var i in need) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }

        filter.chosen('filter', select);
      };

      this.build = function () {
        var _this4 = this;

        this.buildFilter();
        this.filtred();

        filter.onSelect = function (type, a, b) {
          if (type == 'filter') {
            if (a.reset) {
              _this4.buildFilter();
            } else {
              if (a.stype == 'season') {
                _this4.buildFilter(b.index);
              } else {
                var filter_data = Lampa.Storage.get('online_filter', '{}');
                filter_data[a.stype] = b.index;
                a.subtitle = b.title;
                Lampa.Storage.set('online_filter', filter_data);
              }
            }
          }

          _this4.applyFilter();

          _this4.start();
        };

        this.showResults();
      };

      this.filtred = function () {
        filtred = sources[balanser].filtred(results, filter_items);
      };

      this.applyFilter = function () {
        this.filtred();
        this.selectedFilter();
        this.reset();
        this.showResults();
        last = scroll.render().find('.torrent-item:eq(0)')[0];
      };

      this.showResults = function () {
        filter.render().addClass('torrent-filter');
        scroll.append(filter.render());
        if (filtred.length) this.append(filtred);else this.listEmpty();
        files.append(scroll.render());
      };

      this.reset = function () {
        last = false;
        scroll.render().find('.empty').remove();
        filter.render().detach();
        scroll.clear();
      };

      this.listEmpty = function () {
        scroll.append(Lampa.Template.get('list_empty'));
      };

      this.append = function (items) {
        sources[balanser].append({
          scroll: scroll,
          items: items,
          open: this.start.bind(this),
          item: function item(_item) {
            _item.on('hover:focus', function (e) {
              last = e.target;
              scroll.update($(e.target), true);
            });
          }
        });
      };

      this.back = function () {
        Lampa.Activity.backward();
      };

      this.start = function () {
        Lampa.Controller.add('content', {
          toggle: function toggle() {
            Lampa.Controller.collectionSet(scroll.render(), files.render());
            Lampa.Controller.collectionFocus(last || false, scroll.render());
          },
          up: function up() {
            if (Navigator.canmove('up')) {
              if (scroll.render().find('.selector').slice(3).index(last) == 0 && last_filter) {
                Lampa.Controller.collectionFocus(last_filter, scroll.render());
              } else Navigator.move('up');
            } else Lampa.Controller.toggle('head');
          },
          down: function down() {
            Navigator.move('down');
          },
          right: function right() {
            Navigator.move('right');
          },
          left: function left() {
            if (Navigator.canmove('left')) Navigator.move('left');else Lampa.Controller.toggle('menu');
          },
          back: this.back
        });
        Lampa.Controller.toggle('content');
      };

      this.pause = function () {};

      this.stop = function () {};

      this.render = function () {
        return files.render();
      };

      this.destroy = function () {
        network.clear();
        files.destroy();
        scroll.destroy();
        results = null;
        network = null;
      };
    }

    function startPlugin() {
      window.plugin_online_ready = true;
      Lampa.Component.add('online', component);
      Lampa.Template.add('button_online', "<div class=\"full-start__button selector view--online\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 30.051 30.051\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M19.982,14.438l-6.24-4.536c-0.229-0.166-0.533-0.191-0.784-0.062c-0.253,0.128-0.411,0.388-0.411,0.669v9.069   c0,0.284,0.158,0.543,0.411,0.671c0.107,0.054,0.224,0.081,0.342,0.081c0.154,0,0.31-0.049,0.442-0.146l6.24-4.532   c0.197-0.145,0.312-0.369,0.312-0.607C20.295,14.803,20.177,14.58,19.982,14.438z\" fill=\"currentColor\"/>\n        <path d=\"M15.026,0.002C6.726,0.002,0,6.728,0,15.028c0,8.297,6.726,15.021,15.026,15.021c8.298,0,15.025-6.725,15.025-15.021   C30.052,6.728,23.324,0.002,15.026,0.002z M15.026,27.542c-6.912,0-12.516-5.601-12.516-12.514c0-6.91,5.604-12.518,12.516-12.518   c6.911,0,12.514,5.607,12.514,12.518C27.541,21.941,21.937,27.542,15.026,27.542z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>\u041E\u043D\u043B\u0430\u0439\u043D</span>\n    </div>");
      Lampa.Template.add('online', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div class=\"online__title\">{title}</div>\n            <div class=\"online__quality\">{quality}</div>\n        </div>\n    </div>");
      Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
          var btn = Lampa.Template.get('button_online');
          btn.on('hover:enter', function () {
            Lampa.Activity.push({
              url: '',
              title: 'Онлайн',
              component: 'online',
              search: e.data.movie.title,
              search_one: e.data.movie.title,
              search_two: e.data.movie.original_title,
              movie: e.data.movie,
              page: 1
            });
          });
          e.object.activity.render().find('.view--torrent').after(btn);
        }
      });
    }

    if (!window.plugin_online_ready) startPlugin();

})();
