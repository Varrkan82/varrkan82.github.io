(function () {
    'use strict';

    function videocdn(component) {
      var network = new Lampa.Reguest();
      var object = {};
      var extract = {};
      var results = [];
      var filter_items = {};
      var choice = {
        season: 0,
        voice: 0
      };
      /**
       * Начать поиск
       * @param {Object} _object 
       */

      this.search = function (_object, found) {
        object = _object;
        results = found;
        success(found);
        component.loading(false);
      };
      /**
       * Сброс фильтра
       */


      this.reset = function () {
        component.reset();
        choice = {
          season: 0,
          voice: 0
        };
        filter();
        append(filtred());
      };
      /**
       * Применить фильтр
       * @param {*} type 
       * @param {*} a 
       * @param {*} b 
       */


      this.filter = function (type, a, b) {
        choice[a.stype] = b.index;
        component.reset();
        filter();
        append(filtred());
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
        results = null;
      };
      /**
       * Успешно, есть данные
       * @param {Object} json 
       */


      function success(json) {
        results = json;
        extractData(json);
        filter();
        append(filtred());
      }
      /**
       * Получить потоки
       * @param {String} str 
       * @param {Int} max_quality 
       * @returns string
       */


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
      /**
       * Получить информацию о фильме
       * @param {Arrays} results 
       */


      function extractData(results) {
        network.timeout(5000);
        var movie = results.slice(0, 1)[0];
        extract = {};

        if (movie) {
          var src = movie.iframe_src;
          network["native"]('http:' + src, function (raw) {
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
      /**
       * Найти поток
       * @param {Object} element 
       * @param {Int} max_quality 
       * @param {Boolean} show_error 
       * @returns string
       */


      function getFile(element, max_quality, show_error) {
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
      /**
       * Построить фильтр
       */


      function filter() {
        filter_items = {
          season: [],
          voice: [],
          voice_info: []
        };
        results.slice(0, 1).forEach(function (movie) {
          if (movie.season_count) {
            var s = movie.season_count;

            while (s--) {
              filter_items.season.push('Сезон ' + (movie.season_count - s));
            }
          }

          if (filter_items.season.length) {
            movie.episodes.forEach(function (episode) {
              if (episode.season_num == choice.season + 1) {
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
          }
          /*
          else{
              movie.translations.forEach(element=>{
                  filter_items.voice.push(element.smart_title)
                  filter_items.voice_info.push({
                      id: element.id
                  })
              })
          }
          */

        });
        component.filter(filter_items, choice);
      }
      /**
       * Отфильтровать файлы
       * @returns array
       */


      function filtred() {
        var filtred = [];
        var filter_data = Lampa.Storage.get('online_filter', '{}');

        if (object.movie.number_of_seasons) {
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
              //if(filter_items.voice_info[filter_data.voice].id == element.translation_id){
              filtred.push({
                title: element.translation.title,
                quality: element.max_quality + 'p',
                translation: element.translation_id
              }); //}
            });
          });
        }

        return filtred;
      }
      /**
       * Добавить видео
       * @param {Array} items 
       */


      function append(items) {
        component.reset();
        items.forEach(function (element) {
          if (element.season) element.title = 'S' + element.season + ' / Серия ' + element.title;
          element.info = element.season ? ' / ' + filter_items.voice[choice.voice] : '';
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          item.addClass('video--stream');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            var file = getFile(element, element.quality, true);

            if (file) {
              var playlist = [];
              var first = {
                url: file,
                timeline: view,
                title: element.season ? element.title : object.movie.title + ' / ' + element.title
              };
              Lampa.Player.play(first);

              if (element.season) {
                items.forEach(function (elem) {
                  playlist.push({
                    title: elem.title,
                    url: getFile(elem, elem.quality),
                    timeline: elem.timeline
                  });
                });
              } else {
                playlist.push(first);
              }

              Lampa.Player.playlist(playlist);
            }
          });
          component.append(item);
        });
        component.start(true);
      }
    }

    function create(component) {
      var network = new Lampa.Reguest();
      var object = {};
      var extract = {};
      var select_title = '';
      var select_id = '';
      var filter_items = {};
      var choice = {
        season: 0,
        voice: 0
      };
      /**
       * Поиск
       * @param {Object} _object 
       */

      this.search = function (_object, kinopoisk_id) {
        object = _object;
        select_id = kinopoisk_id;
        select_title = object.movie.title;
        getFilm(kinopoisk_id);
      };
      /**
       * Сброс фильтра
       */


      this.reset = function () {
        component.reset();
        choice = {
          season: 0,
          voice: 0
        };
        component.loading(true);
        getFilm(select_id);
      };
      /**
       * Применить фильтр
       * @param {*} type 
       * @param {*} a 
       * @param {*} b 
       */


      this.filter = function (type, a, b) {
        choice[a.stype] = b.index;
        component.reset();
        filter();
        component.loading(true);
        getFilm(select_id, extract.voice[choice.voice].token);
        setTimeout(component.closeFilter, 10);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
        extract = null;
      };
      /**
       * Запросить фильм
       * @param {Int} id 
       * @param {String} voice 
       */


      function getFilm(id, voice) {
        network.clear();
        network.timeout(10000);
        var url = 'https://voidboost.net/';

        if (voice) {
          if (extract.season.length) {
            url += 'serial/' + voice + '/iframe?s=' + extract.season[choice.season].id + '&h=gidonline.io';
          } else {
            url += 'movie/' + voice + '/iframe?h=gidonline.io';
          }
        } else url += 'embed/' + id;

        network["native"](url, function (str) {
          component.loading(false);
          extractData(str);
          filter();
          append();
        }, function () {
          component.empty();
        }, false, {
          dataType: 'text'
        });
      }
      /**
       * Построить фильтр
       */


      function filter() {
        filter_items = {
          season: extract.season.map(function (v) {
            return v.name;
          }),
          voice: extract.season.length ? extract.voice.map(function (v) {
            return v.name;
          }) : []
        };
        component.filter(filter_items, choice);
      }
      /**
       * Получить поток
       * @param {*} element 
       */


      function getStream(element, call, error) {
        if (element.stream) return call(element.stream);
        var url = 'https://voidboost.net/';

        if (element.season) {
          url += 'serial/' + extract.voice[choice.voice].token + '/iframe?s=' + element.season + '&e=' + element.episode + '&h=gidonline.io';
        } else {
          url += 'movie/' + element.voice.token + '/iframe?h=gidonline.io';
        }

        network.clear();
        network.timeout(3000);
        network["native"](url, function (str) {
          var videos = str.match("file': '(.*?)'");

          if (videos) {
            var link = videos[0].match("2160p](.*?)mp4");
            if (!link) link = videos[0].match("1440p](.*?)mp4");
            if (!link) link = videos[0].match("1080p Ultra](.*?)mp4");
            if (!link) link = videos[0].match("1080p](.*?)mp4");
            if (!link) link = videos[0].match("720p](.*?)mp4");
            if (!link) link = videos[0].match("480p](.*?)mp4");
            if (!link) link = videos[0].match("360p](.*?)mp4");
            if (!link) link = videos[0].match("240p](.*?)mp4");

            if (link) {
              element.stream = link[1] + 'mp4';
              call(link[1] + 'mp4');
            } else error();
          } else error();
        }, error, false, {
          dataType: 'text'
        });
      }
      /**
       * Получить данные о фильме
       * @param {String} str 
       */


      function extractData(str) {
        extract.voice = [];
        extract.season = [];
        extract.episode = [];
        str = str.replace(/\n/g, '');
        var voices = str.match('<select name="translator"[^>]+>(.*?)</select>');
        var sesons = str.match('<select name="season"[^>]+>(.*?)</select>');
        var episod = str.match('<select name="episode"[^>]+>(.*?)</select>');

        if (voices) {
          var select = $('<select>' + voices[1] + '</select>');
          $('option', select).each(function () {
            var token = $(this).attr('data-token');

            if (token) {
              extract.voice.push({
                token: token,
                name: $(this).text()
              });
            }
          });
        }

        if (sesons) {
          var _select = $('<select>' + sesons[1] + '</select>');

          $('option', _select).each(function () {
            extract.season.push({
              id: $(this).attr('value'),
              name: $(this).text()
            });
          });
        }

        if (episod) {
          var _select2 = $('<select>' + episod[1] + '</select>');

          $('option', _select2).each(function () {
            extract.episode.push({
              id: $(this).attr('value'),
              name: $(this).text()
            });
          });
        }
      }
      /**
       * Показать файлы
       */


      function append() {
        component.reset();
        var items = [];

        if (extract.season.length) {
          extract.episode.forEach(function (episode) {
            items.push({
              title: 'S' + (choice.season + 1) + ' / ' + episode.name,
              quality: '720p ~ 1080p',
              season: choice.season + 1,
              episode: parseInt(episode.id),
              info: ' / ' + extract.voice[choice.voice].name
            });
          });
        } else {
          extract.voice.forEach(function (voice) {
            items.push({
              title: voice.name.length > 3 ? voice.name : select_title,
              quality: '720p ~ 1080p',
              voice: voice,
              info: ''
            });
          });
        }

        items.forEach(function (element) {
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            getStream(element, function (stream) {
              var first = {
                url: stream,
                timeline: view,
                title: element.title
              };
              Lampa.Player.play(first);
              Lampa.Player.playlist([first]);
            }, function () {
              Lampa.Noty.show('Не удалось извлечь ссылку');
            });
          });
          component.append(item);
        });
        component.start(true);
      }
    }

    function component(object) {
      var network = new Lampa.Reguest();
      var scroll = new Lampa.Scroll({
        mask: true,
        over: true
      });
      var files = new Lampa.Files(object);
      var filter = new Lampa.Filter(object);
      var balanser = Lampa.Storage.get('online_balanser', 'videocdn');
      var sources = {
        videocdn: new videocdn(this),
        rezka: new create(this)
      };
      var last;
      var last_filter;
      var filter_translate = {
        season: 'Сезон',
        voice: 'Перевод',
        source: 'Источник'
      };
      var filter_sources = ['videocdn', 'rezka'];
      scroll.minus();
      scroll.body().addClass('torrent-list');
      /**
       * Подготовка
       */

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

        filter.render().find('.selector').on('hover:focus', function (e) {
          last_filter = e.target;
        });

        filter.onSelect = function (type, a, b) {
          if (type == 'filter') {
            if (a.reset) {
              sources[balanser].reset();
            } else {
              if (a.stype == 'source') {
                balanser = filter_sources[b.index];
                Lampa.Storage.set('online_balanser', balanser);

                _this.search();

                setTimeout(Lampa.Select.close, 10);
              } else {
                sources[balanser].filter(type, a, b);
              }
            }
          }
        };

        filter.render().find('.filter--sort').remove();
        filter.render().addClass('torrent-filter');
        files.append(scroll.render());
        scroll.append(filter.render());
        this.search();
        return this.render();
      };
      /**
       * Начать поиск
       */


      this.search = function () {
        this.activity.loader(true);
        this.filter({
          source: filter_sources
        }, {
          source: 0
        });
        this.reset();
        this.find();
      };

      this.find = function () {
        var _this2 = this;

        var url = 'https://videocdn.tv/api/';
        var query = object.movie.imdb_id || object.search;

        function isAnime(genres) {
          return genres.filter(function (gen) {
            return gen.id == 16;
          }).length;
        }

        if (object.movie.original_language == 'ja' && isAnime(object.movie.genres)) {
          url += object.movie.number_of_seasons ? 'anime-tv-series' : 'animes';
        } else {
          url += object.movie.number_of_seasons ? 'tv-series' : 'movies';
        }

        url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');
        url = Lampa.Utils.addUrlComponent(url, 'query=' + encodeURIComponent(query));
        url = Lampa.Utils.addUrlComponent(url, 'field=global');
        network.clear();
        network.silent(url, function (json) {
          if (json.data && json.data.length) {
            if (json.data.length == 1 || object.clarification) {
              if (balanser == 'videocdn') sources[balanser].search(object, json.data);else sources[balanser].search(object, json.data[0].kinopoisk_id);
            } else {
              _this2.similars(json.data);

              _this2.loading(false);
            }
          } else _this2.empty('По запросу (' + query + ') нет результатов');
        }, function (a, c) {
          _this2.empty(network.errorDecode(a, c));
        });
      };
      /**
       * Есть похожие карточки
       * @param {Object} json 
       */


      this.similars = function (json) {
        var _this3 = this;

        json.forEach(function (elem) {
          var year = elem.start_date || elem.year;
          elem.title = elem.ru_title;
          elem.quality = year ? (year + '').slice(0, 4) : '----';
          elem.info = '';
          var item = Lampa.Template.get('online_folder', elem);
          item.on('hover:enter', function () {
            _this3.activity.loader(true);

            _this3.reset();

            if (balanser == 'videocdn') sources[balanser].search(object, [elem]);else sources[balanser].search(object, elem.kinopoisk_id);
          });

          _this3.append(item);
        });
      };
      /**
       * Очистить список файлов
       */


      this.reset = function () {
        last = false;
        scroll.render().find('.empty').remove();
        filter.render().detach();
        scroll.clear();
        scroll.append(filter.render());
      };
      /**
       * Загрузка
       */


      this.loading = function (status) {
        if (status) this.activity.loader(true);else {
          this.activity.loader(false);
          this.activity.toggle();
        }
      };
      /**
       * Построить фильтр
       */


      this.filter = function (filter_items, choice) {
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

        filter_items.source = filter_sources;
        choice.source = filter_sources.indexOf(balanser);
        select.push({
          title: 'Сбросить фильтр',
          reset: true
        });
        Lampa.Storage.set('online_filter', choice);
        if (filter_items.voice && filter_items.voice.length) add('voice', 'Перевод');
        if (filter_items.season && filter_items.season.length) add('season', 'Сезон');
        add('source', 'Источник');
        filter.set('filter', select);
        this.selected(filter_items);
      };
      /**
       * Закрыть фильтр
       */


      this.closeFilter = function () {
        if ($('body').hasClass('selectbox--open')) Lampa.Select.close();
      };
      /**
       * Показать что выбрано в фильтре
       */


      this.selected = function (filter_items) {
        var need = Lampa.Storage.get('online_filter', '{}'),
            select = [];

        for (var i in need) {
          if (filter_items[i].length) {
            if (i == 'voice' || i == 'source') {
              select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
            } else {
              if (filter_items.season.length >= 1) {
                select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
              }
            }
          }
        }

        filter.chosen('filter', select);
      };
      /**
       * Добавить файл
       */


      this.append = function (item) {
        item.on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(item);
      };
      /**
       * Показать пустой результат
       */


      this.empty = function (msg) {
        var empty = Lampa.Template.get('list_empty');
        if (msg) empty.find('.empty__descr').text(msg);
        scroll.append(empty);
        this.loading(false);
      };
      /**
       * Начать навигацию по файлам
       */


      this.start = function (first_select) {
        if (first_select) {
          last = scroll.render().find('.selector').eq(2)[0];
        }

        Lampa.Controller.add('content', {
          toggle: function toggle() {
            Lampa.Controller.collectionSet(scroll.render(), files.render());
            Lampa.Controller.collectionFocus(last || false, scroll.render());
          },
          up: function up() {
            if (Navigator.canmove('up')) {
              if (scroll.render().find('.selector').slice(2).index(last) == 0 && last_filter) {
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

      this.render = function () {
        return files.render();
      };

      this.back = function () {
        Lampa.Activity.backward();
      };

      this.pause = function () {};

      this.stop = function () {};

      this.destroy = function () {
        network.clear();
        files.destroy();
        scroll.destroy();
        network = null;
        sources.videocdn.destroy();
        sources.rezka.destroy();
      };
    }

    function startPlugin() {
      window.plugin_online_ready = true;
      Lampa.Component.add('online', component);
      Lampa.Template.add('button_online', "<div class=\"full-start__button selector view--online\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 30.051 30.051\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M19.982,14.438l-6.24-4.536c-0.229-0.166-0.533-0.191-0.784-0.062c-0.253,0.128-0.411,0.388-0.411,0.669v9.069   c0,0.284,0.158,0.543,0.411,0.671c0.107,0.054,0.224,0.081,0.342,0.081c0.154,0,0.31-0.049,0.442-0.146l6.24-4.532   c0.197-0.145,0.312-0.369,0.312-0.607C20.295,14.803,20.177,14.58,19.982,14.438z\" fill=\"currentColor\"/>\n        <path d=\"M15.026,0.002C6.726,0.002,0,6.728,0,15.028c0,8.297,6.726,15.021,15.026,15.021c8.298,0,15.025-6.725,15.025-15.021   C30.052,6.728,23.324,0.002,15.026,0.002z M15.026,27.542c-6.912,0-12.516-5.601-12.516-12.514c0-6.91,5.604-12.518,12.516-12.518   c6.911,0,12.514,5.607,12.514,12.518C27.541,21.941,21.937,27.542,15.026,27.542z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>\u041E\u043D\u043B\u0430\u0439\u043D</span>\n    </div>");
      Lampa.Template.add('online', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"64\" cy=\"64\" r=\"56\" stroke=\"white\" stroke-width=\"16\"/>\n                    <path d=\"M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
      Lampa.Template.add('online_folder', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"/>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"/>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
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
