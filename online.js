//20.05.2022 - Fix activity bag and cdn https

(function () {
    'use strict';

    function videocdn(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var results = [];
      var object = _object;
      var select_title = '';
      var filter_items = {};
      var choice = {
        season: 0,
        voice: 0
      };
      /**
       * Начать поиск
       * @param {Object} _object 
       */

      this.search = function (_object, data) {
        object = _object;
        select_title = object.movie.title;
        var url = 'http://cdn.svetacdn.in/api/';
        var itm = data[0];
        var type = itm.iframe_src.split('/').slice(-2)[0];
        if (type == 'movie') type = 'movies';
        url += type;
        url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');
        url = Lampa.Utils.addUrlComponent(url, itm.imdb_id ? 'imdb_id=' + encodeURIComponent(itm.imdb_id) : 'title=' + encodeURIComponent(itm.title));
        url = Lampa.Utils.addUrlComponent(url, 'field=' + encodeURIComponent('global'));
        network.silent(url, function (found) {
          results = found.data.filter(function (elem) {
            return elem.id == itm.id;
          });
          success(results);
          component.loading(false);
          if (!results.length) component.empty('По запросу (' + select_title + ') нет результатов');
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        });
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
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
        component.saveChoice(choice);
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
        component.saveChoice(choice);
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
       * @returns string
       */


      function getFile(element, max_quality) {
        var translat = extract[element.translation];
        var id = element.season + '_' + element.episode;
        var file = '';
        var quality = false;

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
          var path = file.slice(0, file.lastIndexOf('/')) + '/';

          if (file.split('/').pop().replace('.mp4', '') !== max_quality) {
            file = path + max_quality + '.mp4';
          }

          quality = {};
          var mass = [1080, 720, 480, 360];
          mass = mass.slice(mass.indexOf(max_quality));
          mass.forEach(function (n) {
            quality[n + 'p'] = path + n + '.mp4';
          });
          var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
          if (quality[preferably]) file = quality[preferably];
        }

        return {
          file: file,
          quality: quality
        };
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
              filtred.push({
                title: element.translation.title,
                quality: element.max_quality + 'p' + (element.source_quality ? ' - ' + element.source_quality.toUpperCase() : ''),
                translation: element.translation_id
              });
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
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        items.forEach(function (element) {
          if (element.season) element.title = 'S' + element.season + ' / Серия ' + element.title;
          element.info = element.season ? ' / ' + filter_items.voice[choice.voice] : '';
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
          item.addClass('video--stream');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            var extra = getFile(element, element.quality);

            if (extra.file) {
              var playlist = [];
              var first = {
                url: extra.file,
                quality: extra.quality,
                timeline: view,
                title: element.season ? element.title : object.movie.title + ' / ' + element.title
              };

              if (element.season) {
                items.forEach(function (elem) {
                  var ex = getFile(elem, elem.quality);
                  playlist.push({
                    title: elem.title,
                    url: ex.file,
                    quality: ex.quality,
                    timeline: elem.timeline
                  });
                });
              } else {
                playlist.push(first);
              }

              if (playlist.length > 1) first.playlist = playlist;
              Lampa.Player.play(first);
              Lampa.Player.playlist(playlist);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            } else Lampa.Noty.show('Не удалось извлечь ссылку');
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              call(getFile(element, element.quality));
            }
          });
        });
        component.start(true);
      }
    }

    function rezka(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var embed = 'https://voidboost.net/';
      var object = _object;
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
        getFirstTranlate(kinopoisk_id, function (voice) {
          getFilm(kinopoisk_id, voice);
        });
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
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
        component.saveChoice(choice);
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
        component.saveChoice(choice);
        setTimeout(component.closeFilter, 10);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
        extract = null;
      };

      function getSeasons(voice, call) {
        var url = embed + 'serial/' + voice + '/iframe?h=gidonline.io';
        network.clear();
        network.timeout(10000);
        network["native"](url, function (str) {
          extractData(str);
          call();
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      }

      function getFirstTranlate(id, call) {
        network.clear();
        network.timeout(10000);
        network["native"](embed + 'embed/' + id + '?s=1', function (str) {
          extractData(str);
          if (extract.voice.length) call(extract.voice[0].token);else component.empty('По запросу (' + select_title + ') нет результатов');
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      }

      function getEmbed(url) {
        network.clear();
        network.timeout(10000);
        network["native"](url, function (str) {
          component.loading(false);
          extractData(str);
          filter();
          append();
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      }
      /**
       * Запросить фильм
       * @param {Int} id 
       * @param {String} voice 
       */


      function getFilm(id, voice) {
        network.clear();
        network.timeout(10000);
        var url = embed;

        if (voice) {
          if (extract.season.length) {
            var ses = extract.season[Math.min(extract.season.length - 1, choice.season)].id;
            url += 'serial/' + voice + '/iframe?s=' + ses + '&h=gidonline.io';
            return getSeasons(voice, function () {
              var check = extract.season.filter(function (s) {
                return s.id == ses;
              });

              if (!check.length) {
                choice.season = extract.season.length - 1;
                url = embed + 'serial/' + voice + '/iframe?s=' + extract.season[Math.min(extract.season.length - 1, choice.season)].id + '&h=gidonline.io';
              }

              getEmbed(url);
            });
          } else {
            url += 'movie/' + voice + '/iframe?h=gidonline.io';
            getEmbed(url);
          }
        } else {
          url += 'embed/' + id;
          url += '?s=1';
          getEmbed(url);
        }
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

      function parseSubtitles(str) {
        var subtitle = str.match("subtitle': '(.*?)'");

        if (subtitle) {
          var index = -1;
          return subtitle[1].split(',').map(function (sb) {
            var sp = sb.split(']');
            index++;
            return {
              label: sp[0].slice(1),
              url: sp.pop(),
              index: index
            };
          });
        }
      }
      /**
       * Получить поток
       * @param {*} element 
       */


      function getStream(element, call, error) {
        if (element.stream) return call(element.stream);
        var url = embed;

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
            var video = decode(videos[1]),
                qused = '',
                first = '',
                mass = ['2160p', '1440p', '1080p Ultra', '1080p', '720p', '480p', '360p']; //ухня тут происходит, хрен знает почему после .join() возврошает только последнию ссылку

            video = video.slice(1).split(/,\[/).map(function (s) {
              return s.split(']')[0] + ']' + (s.indexOf(' or ') > -1 ? s.split(' or').pop().trim() : s.split(']').pop());
            }).join('[');
            element.qualitys = {};
            var preferably = Lampa.Storage.get('video_quality_default', '1080');
            mass.forEach(function (n) {
              var link = video.match(new RegExp(n + "](.*?)mp4"));

              if (link) {
                if (!first) first = link[1] + 'mp4';
                element.qualitys[n] = link[1] + 'mp4';

                if (n.indexOf(preferably) >= 0) {
                  qused = link[1] + 'mp4';
                  first = qused;
                }
              }
            });
            if (!first) element.qualitys = false;

            if (first) {
              element.stream = qused || first;
              element.subtitles = parseSubtitles(str);
              call(element.stream);
            } else error();
          } else error();
        }, error, false, {
          dataType: 'text'
        });
      }

      function decode(data) {
        function product(iterables, repeat) {
          var argv = Array.prototype.slice.call(arguments),
              argc = argv.length;

          if (argc === 2 && !isNaN(argv[argc - 1])) {
            var copies = [];

            for (var i = 0; i < argv[argc - 1]; i++) {
              copies.push(argv[0].slice()); // Clone
            }

            argv = copies;
          }

          return argv.reduce(function tl(accumulator, value) {
            var tmp = [];
            accumulator.forEach(function (a0) {
              value.forEach(function (a1) {
                tmp.push(a0.concat(a1));
              });
            });
            return tmp;
          }, [[]]);
        }

        function unite(arr) {
          var _final = [];
          arr.forEach(function (e) {
            _final.push(e.join(""));
          });
          return _final;
        }

        var trashList = ["@", "#", "!", "^", "$"];
        var two = unite(product(trashList, 2));
        var tree = unite(product(trashList, 3));
        var trashCodesSet = two.concat(tree);
        var arr = data.replace("#h", "").split("//_//");
        var trashString = arr.join('');
        trashCodesSet.forEach(function (i) {
          trashString = trashString.replace(new RegExp(btoa(i), 'g'), '');
        });
        var result = '';

        try {
          result = atob(trashString.substr(2));
        } catch (e) {}

        return result;
      }
      /*
      function decode(x){
          let file = x.replace('JCQkIyMjIyEhISEhISE=', '')
              .replace('QCMhQEBAIyMkJEBA', '')
              .replace('QCFeXiFAI0BAJCQkJCQ=', '')
              .replace('Xl4jQEAhIUAjISQ=', '')
              .replace('Xl5eXl5eIyNAzN2FkZmRm', '')
              .split('//_//')
              .join('')
              .substr(2)
          try {
              return atob(file)
          } catch (e){
              console.log("Encrypt error: ", file)
              return ''
          }
      }
      */

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

        if (sesons) {
          var select = $('<select>' + sesons[1] + '</select>');
          $('option', select).each(function () {
            extract.season.push({
              id: $(this).attr('value'),
              name: $(this).text()
            });
          });
        }

        if (voices) {
          var _select = $('<select>' + voices[1] + '</select>');

          $('option', _select).each(function () {
            var token = $(this).attr('data-token');

            if (token) {
              extract.voice.push({
                token: token,
                name: $(this).text(),
                id: $(this).val()
              });
            }
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
        var viewed = Lampa.Storage.cache('online_view', 5000, []);

        if (extract.season.length) {
          extract.episode.forEach(function (episode) {
            items.push({
              title: 'S' + extract.season[Math.min(extract.season.length - 1, choice.season)].id + ' / ' + episode.name,
              quality: '720p ~ 1080p',
              season: extract.season[Math.min(extract.season.length - 1, choice.season)].id,
              episode: parseInt(episode.id),
              info: ' / ' + extract.voice[choice.voice].name,
              voice: extract.voice[choice.voice]
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
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.voice.name].join('') : object.movie.original_title + element.voice.name);
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            getStream(element, function (stream) {
              var first = {
                url: stream,
                timeline: view,
                quality: element.qualitys,
                title: element.title
              };
              Lampa.Player.play(first);
              Lampa.Player.playlist([first]);
              if (element.subtitles && Lampa.Player.subtitles) Lampa.Player.subtitles(element.subtitles);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            }, function () {
              Lampa.Noty.show('Не удалось извлечь ссылку');
            });
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              getStream(element, function (stream) {
                call({
                  file: stream,
                  quality: element.qualitys
                });
              });
            }
          });
        });
        component.start(true);
      }
    }

    function kinobase(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var prox = Lampa.Storage.field('proxy_other') === false ? '' : 'https://cors.eu.org/';
      var embed = prox + 'https://kinobase.org/';
      var object = _object;
      var select_title = '';
      var select_id = '';
      var filter_items = {};
      var choice = {
        season: 0,
        voice: -1,
        quality: -1
      };
      /**
       * Поиск
       * @param {Object} _object
       * @param {String} kinopoisk_id
       */

      this.search = function (_object, kp_id, sim) {
        var _this = this;

        if (this.wait_similars && sim) return getPage(sim[0].link);
        object = _object;
        select_title = object.movie.title;
        var url = embed + "search?query=" + encodeURIComponent(cleanTitle(select_title));
        network["native"](url, function (str) {
          str = str.replace(/\n/, '');
          var links = object.movie.number_of_seasons ? str.match(/<a href="\/serial\/(.*?)">(.*?)<\/a>/g) : str.match(/<a href="\/film\/(.*?)" class="link"[^>]+>(.*?)<\/a>/g);
          var relise = object.search_date || (object.movie.number_of_seasons ? object.movie.first_air_date : object.movie.release_date) || '0000';
          var need_year = parseInt((relise + '').slice(0, 4));
          var found_url = '';

          if (links) {
            var cards = [];
            links.filter(function (l) {
              var link = $(l),
                  titl = link.attr('title') || link.text() || '';
              var year = parseInt(titl.split('(').pop().slice(0, -1));
              if (year > need_year - 2 && year < need_year + 2) cards.push({
                year: year,
                title: titl.split(/\(\d{4}\)/)[0].trim(),
                link: link.attr('href')
              });
            });
            var card = cards.find(function (c) {
              return c.year == need_year;
            });
            if (!card) card = cards.find(function (c) {
              return c.title == select_title;
            });
            if (!card && cards.length == 1) card = cards[0];
            if (card) found_url = cards[0].link;
            if (found_url) getPage(found_url);else if (links.length) {
              _this.wait_similars = true;
              var similars = [];
              links.forEach(function (l) {
                var link = $(l),
                    titl = link.attr('title') || link.text();
                similars.push({
                  title: titl,
                  link: link.attr('href'),
                  filmId: 'similars'
                });
              });
              component.similars(similars);
              component.loading(false);
            } else component.empty('По запросу (' + select_title + ') нет результатов');
          } else component.empty('По запросу (' + select_title + ') нет результатов');
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
      };
      /**
       * Сброс фильтра
       */


      this.reset = function () {
        component.reset();
        choice = {
          season: 0,
          voice: -1
        };
        append(filtred());
        component.saveChoice(choice);
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
        component.saveChoice(choice);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
        extract = null;
      };

      function cleanTitle(str) {
        return str.replace('.', '').replace(':', '');
      }

      function filter() {
        filter_items = {
          season: [],
          voice: [],
          quality: []
        };

        if (object.movie.number_of_seasons) {
          if (extract[0].playlist) {
            extract.forEach(function (item) {
              filter_items.season.push(item.comment);
            });
          }
        }

        component.filter(filter_items, choice);
      }

      function filtred() {
        var filtred = [];

        if (object.movie.number_of_seasons) {
          var playlist = extract[choice.season].playlist || extract;
          var season = parseInt(extract[choice.season].comment);
          playlist.forEach(function (serial) {
            var quality = serial.file.match(/\[(\d+)p\]/g).pop().replace(/\[|\]/g, '');
            var voice = serial.file.match("{([^}]+)}");
            filtred.push({
              file: serial.file,
              title: serial.comment,
              quality: quality,
              season: isNaN(season) ? 1 : season,
              info: voice ? ' / ' + voice[1] : '',
              subtitles: parseSubs(serial.subtitle || '')
            });
          });
        } else {
          extract.forEach(function (elem) {
            var quality = elem.file.match(/\[(\d+)p\]/g).pop().replace(/\[|\]/g, '');
            var voice = elem.file.match("{([^}]+)}");
            if (!elem.title) elem.title = elem.comment || (voice ? voice[1] : 'Без названия');
            if (!elem.quality) elem.quality = quality;
            if (!elem.info) elem.info = '';
          });
          filtred = extract;
        }

        return filtred;
      }

      function parseSubs(vod) {
        var subtitles = [];
        vod.split(',').forEach(function (s) {
          var nam = s.match("\\[(.*?)]");

          if (nam) {
            var url = s.replace(/\[.*?\]/, '').split(' or ')[0];

            if (url) {
              subtitles.push({
                label: nam[1],
                url: url
              });
            }
          }
        });
        return subtitles.length ? subtitles : false;
      }
      /**
       * Получить данные о фильме
       * @param {String} str
       */


      function extractData(str, page) {
        var vod = str.split('|');

        if (vod[0] == 'file') {
          var file = str.match("file\\|([^\\|]+)\\|");
          var found = [];
          var subtiles = parseSubs(vod[2]);
          var quality_type = page.replace(/\n/g, '').replace(/ /g, '').match(/<li><b>Качество:<\/b>(\w+)<\/li>/i);

          if (file) {
            str = file[1].replace(/\n/g, '');
            str.split(',').forEach(function (el) {
              var quality = el.match("\\[(\\d+)p");
              el.split(';').forEach(function (el2) {
                var voice = el2.match("{([^}]+)}");
                var links = voice ? el2.match("}([^;]+)") : el2.match("\\]([^;]+)");
                found.push({
                  file: file[1],
                  title: object.movie.title,
                  quality: quality[1] + 'p' + (quality_type ? ' - ' + quality_type[1] : ''),
                  voice: voice ? voice[1] : '',
                  stream: links[1].split(' or ')[0],
                  subtitles: subtiles,
                  info: ' '
                });
              });
            });
            found.reverse();
          }

          extract = found;
        } else if (vod[0] == 'pl') extract = Lampa.Arrays.decodeJson(vod[1], []);else component.empty('По запросу (' + select_title + ') нет результатов');
      }

      function getPage(url) {
        network.clear();
        network.timeout(1000 * 10);
        network["native"](embed + url, function (str) {
          str = str.replace(/\n/g, '');
          var MOVIE_ID = str.match('var MOVIE_ID = ([^;]+);');
          var IDENTIFIER = str.match('var IDENTIFIER = "([^"]+)"');
          var PLAYER_CUID = str.match('var PLAYER_CUID = "([^"]+)"');

          if (MOVIE_ID && IDENTIFIER && PLAYER_CUID) {
            select_id = MOVIE_ID[1];
            var identifier = IDENTIFIER[1];
            var player_cuid = PLAYER_CUID[1];
            var data_url = "user_data";
            data_url = Lampa.Utils.addUrlComponent(data_url, "page=movie");
            data_url = Lampa.Utils.addUrlComponent(data_url, "movie_id=" + select_id);
            data_url = Lampa.Utils.addUrlComponent(data_url, "cuid=" + player_cuid);
            data_url = Lampa.Utils.addUrlComponent(data_url, "device=DESKTOP");
            data_url = Lampa.Utils.addUrlComponent(data_url, "_=" + Date.now());
            network.clear();
            network.timeout(1000 * 10);
            network["native"](embed + data_url, function (user_data) {
              if (typeof user_data.vod_hash == "string") {
                var file_url = "vod/" + select_id;
                file_url = Lampa.Utils.addUrlComponent(file_url, "identifier=" + identifier);
                file_url = Lampa.Utils.addUrlComponent(file_url, "player_type=new");
                file_url = Lampa.Utils.addUrlComponent(file_url, "file_type=mp4");
                file_url = Lampa.Utils.addUrlComponent(file_url, "st=" + user_data.vod_hash);
                file_url = Lampa.Utils.addUrlComponent(file_url, "e=" + user_data.vod_time);
                file_url = Lampa.Utils.addUrlComponent(file_url, "_=" + Date.now());
                network.clear();
                network.timeout(1000 * 10);
                network["native"](embed + file_url, function (files) {
                  component.loading(false);
                  extractData(files, str);
                  filter();
                  append(filtred());
                }, function (a, c) {
                  component.empty(network.errorDecode(a, c));
                }, false, {
                  dataType: 'text'
                });
              } else component.empty('Не удалось получить HASH');
            }, function (a, c) {
              component.empty(network.errorDecode(a, c));
            });
          } else component.empty('Не удалось получить данные');
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      }

      function getFile(element) {
        var quality = {},
            first = '';
        var preferably = Lampa.Storage.get('video_quality_default', '1080');
        element.file.split(',').reverse().forEach(function (file) {
          var q = file.match("\\[(\\d+)p");

          if (q) {
            quality[q[1] + 'p'] = file.replace(/\[\d+p\]/, '').replace(/{([^}]+)}/, '').split(' or ')[0];
            if (!first || q[1] == preferably) first = quality[q[1] + 'p'];
          }
        });
        element.stream = first;
        element.qualitys = quality;
        return {
          file: first,
          quality: quality
        };
      }
      /**
       * Показать файлы
       */


      function append(items) {
        component.reset();
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        items.forEach(function (element, index) {
          if (element.season) element.title = 'S' + element.season + ' / ' + element.title;
          if (element.voice) element.title = element.voice;
          if (typeof element.episode == 'undefined') element.episode = index + 1;
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.title, 'kinobase'].join('') : object.movie.original_title + element.quality + 'kinobase');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            getFile(element);

            if (element.stream) {
              var playlist = [];
              var first = {
                url: element.stream,
                timeline: view,
                title: element.season ? element.title : element.voice ? object.movie.title + ' / ' + element.title : element.title,
                subtitles: element.subtitles,
                quality: element.qualitys
              };

              if (element.season) {
                items.forEach(function (elem) {
                  getFile(elem);
                  playlist.push({
                    title: elem.title,
                    url: elem.stream,
                    timeline: elem.timeline,
                    subtitles: elem.subtitles,
                    quality: elem.qualitys
                  });
                });
              } else {
                playlist.push(first);
              }

              if (playlist.length > 1) first.playlist = playlist;
              Lampa.Player.play(first);
              Lampa.Player.playlist(playlist);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            } else Lampa.Noty.show('Не удалось извлечь ссылку');
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              call(getFile(element));
            }
          });
        });
        component.start(true);
      }
    }

    function collaps(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var embed = 'https://api.delivembd.ws/embed/';
      var object = _object;
      var select_title = '';
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
        select_title = object.movie.title;
        var url = embed + 'kp/' + kinopoisk_id;
        network.silent(url, function (str) {
          if (str) {
            parse(str);
          } else component.empty('По запросу (' + select_title + ') нет результатов');

          component.loading(false);
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
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
        component.saveChoice(choice);
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
        component.saveChoice(choice);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
        extract = null;
      };

      function parse(str) {
        str = str.replace(/\n/g, '');
        var find = str.match('makePlayer\\({(.*?)}\\);');

        if (find) {
          var json;

          try {
            json = eval('({' + find[1] + '})');
          } catch (e) {}

          if (json) {
            extract = json;
            filter();
            append(filtred());
          } else component.empty('По запросу (' + select_title + ') нет результатов');
        }
      }
      /**
       * Построить фильтр
       */


      function filter() {
        filter_items = {
          season: [],
          voice: [],
          quality: []
        };

        if (extract.playlist) {
          if (extract.playlist.seasons) {
            extract.playlist.seasons.forEach(function (season) {
              filter_items.season.push('Сезон ' + season.season);
            });
          }
        }

        component.filter(filter_items, choice);
      }
      /**
       * Отфильтровать файлы
       * @returns array
       */


      function filtred() {
        var filtred = [];
        var filter_data = Lampa.Storage.get('online_filter', '{}');

        if (extract.playlist) {
          extract.playlist.seasons.forEach(function (season, i) {
            if (i == filter_data.season) {
              season.episodes.forEach(function (episode) {
                filtred.push({
                  file: episode.hls,
                  episode: parseInt(episode.episode),
                  season: season.season,
                  title: episode.title,
                  quality: '',
                  info: episode.audio.names.slice(0, 5).join(', '),
                  subtitles: episode.cc ? episode.cc.map(function (c) {
                    return {
                      label: c.name,
                      url: c.url
                    };
                  }) : false
                });
              });
            }
          });
        } else if (extract.source) {
          var resolution = Lampa.Arrays.getKeys(extract.qualityByWidth).pop();
          var max_quality = extract.qualityByWidth ? extract.qualityByWidth[resolution] || 0 : 0;
          filtred.push({
            file: extract.source.hls,
            title: extract.title,
            quality: max_quality ? max_quality + 'p / ' : '',
            info: extract.source.audio.names.slice(0, 5).join(', '),
            subtitles: extract.source.cc ? extract.source.cc.map(function (c) {
              return {
                label: c.name,
                url: c.url
              };
            }) : false
          });
        }

        return filtred;
      }
      /**
       * Показать файлы
       */


      function append(items) {
        component.reset();
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        items.forEach(function (element) {
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.title].join('') : object.movie.original_title + 'collaps');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);

            if (element.file) {
              var playlist = [];
              var first = {
                url: element.file,
                timeline: view,
                title: element.season ? element.title : element.voice ? object.movie.title + ' / ' + element.title : element.title,
                subtitles: element.subtitles
              };

              if (element.season) {
                items.forEach(function (elem) {
                  playlist.push({
                    title: elem.title,
                    url: elem.file,
                    timeline: elem.timeline,
                    subtitles: elem.subtitles
                  });
                });
              } else {
                playlist.push(first);
              }

              if (playlist.length > 1) first.playlist = playlist;
              Lampa.Player.play(first);
              Lampa.Player.playlist(playlist);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            } else Lampa.Noty.show('Не удалось извлечь ссылку');
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              call({
                file: element.file
              });
            }
          });
        });
        component.start(true);
      }
    }

    function cdnmovies(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var object = _object;
      var select_title = '';
      var prox = Lampa.Storage.field('proxy_other') === false ? '' : 'https://cors.eu.org/';
      var embed = prox + 'https://cdnmovies.net/api/short';
      var token = '02d56099082ad5ad586d7fe4e2493dd9';
      var filter_items = {};
      var choice = {
        season: 0,
        voice: 0
      };
      /**
       * Начать поиск
       * @param {Object} _object 
       */

      this.search = function (_object, kp_id) {
        var _this = this;

        object = _object;
        select_title = object.movie.title;
        var url = embed;
        url = Lampa.Utils.addUrlComponent(url, 'token=' + token);
        url = Lampa.Utils.addUrlComponent(url, 'kinopoisk_id=' + kp_id);
        network.silent(url, function (str) {
          var iframe = String(str).match('"iframe_src":"(.*?)"');

          if (iframe && iframe[1]) {
            iframe = 'https:' + iframe[1].split('\\').join('');

            _this.find(iframe);
          } else {
            component.empty('По запросу (' + select_title + ') нет результатов');
          }
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      };

      this.find = function (url) {
        network.clear();
        network.silent(url, function (json) {
          parse(json);
          component.loading(false);
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        }, false, {
          dataType: 'text'
        });
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
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
        component.saveChoice(choice);
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
        component.saveChoice(choice);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        network.clear();
      };

      function parse(str) {
        str = str.replace(/\n/g, '');
        var find = str.match('Playerjs\\({(.*?)}\\);');
        var videos = str.match("file:'(.*?)'");

        if (videos) {
          var video = decode(videos[1]);

          if (find) {
            var json;

            try {
              json = JSON.parse(video);
            } catch (e) {}

            if (json) {
              extract = json;
              filter();
              append(filtred());
            } else component.empty('По запросу (' + select_title + ') нет результатов');
          }
        } else component.empty('По запросу (' + select_title + ') нет результатов');
      }

      function decode(data) {
        data = data.replace('#2', '').replace('//NTR2amZoY2dkYnJ5ZGtjZmtuZHo1Njg0MzZmcmVkKypk', '').replace('//YXorLWVydyozNDU3ZWRndGpkLWZlcXNwdGYvcmUqcSpZ', '').replace('//LSpmcm9mcHNjcHJwYW1mcFEqNDU2MTIuMzI1NmRmcmdk', '').replace('//ZGY4dmc2OXI5enhXZGx5ZisqZmd4NDU1ZzhmaDl6LWUqUQ==', '').replace('//bHZmeWNnbmRxY3lkcmNnY2ZnKzk1MTQ3Z2ZkZ2YtemQq', '');

        try {
          return decodeURIComponent(atob(data).split("").map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(""));
        } catch (e) {
          return '';
        }
      }
      /**
       * Найти поток
       * @param {Object} element 
       * @param {Int} max_quality
       * @returns string
       */


      function getFile(element) {
        var file = '';
        var quality = false;
        var max_quality = 1080;
        var path = element.slice(0, element.lastIndexOf('/')) + '/';

        if (file.split('/').pop().replace('.mp4', '') !== max_quality) {
          file = path + max_quality + '.mp4';
        }

        quality = {};
        var mass = [1080, 720, 480, 360];
        mass = mass.slice(mass.indexOf(max_quality));
        mass.forEach(function (n) {
          quality[n + 'p'] = path + n + '.mp4';
        });
        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
        return {
          file: file,
          quality: quality
        };
      }
      /**
       * Построить фильтр
       */


      function filter() {
        filter_items = {
          season: [],
          voice: [],
          quality: []
        };

        if (extract[0].folder || object.movie.number_of_seasons) {
          extract.forEach(function (season) {
            filter_items.season.push(season.title);
          });
          extract[choice.season].folder.forEach(function (f) {
            f.folder.forEach(function (t) {
              if (filter_items.voice.indexOf(t.title) == -1) filter_items.voice.push(t.title);
            });
          });
          if (!filter_items.voice[choice.voice]) choice.voice = 0;
        }

        component.filter(filter_items, choice);
      }
      /**
       * Отфильтровать файлы
       * @returns array
       */


      function filtred() {
        var filtred = [];
        var filter_data = Lampa.Storage.get('online_filter', '{}');

        if (extract[0].folder || object.movie.number_of_seasons) {
          extract.forEach(function (t) {
            if (t.title == filter_items.season[filter_data.season]) {
              t.folder.forEach(function (se) {
                se.folder.forEach(function (eps) {
                  if (eps.title == filter_items.voice[choice.voice]) {
                    filtred.push({
                      file: eps.file,
                      episode: parseInt(se.title.match(/\d+/)),
                      season: parseInt(t.title.match(/\d+/)),
                      quality: '360p ~ 1080p',
                      info: ' / ' + Lampa.Utils.shortText(eps.title, 50)
                    });
                  }
                });
              });
            }
          });
        } else {
          extract.forEach(function (data) {
            filtred.push({
              file: data.file,
              title: data.title,
              quality: '360p ~ 1080p',
              info: '',
              subtitles: data.subtitle ? data.subtitle.split(',').map(function (c) {
                return {
                  label: c.split(']')[0].slice(1),
                  url: c.split(']')[1]
                };
              }) : false
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
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        items.forEach(function (element) {
          if (element.season) element.title = 'S' + element.season + ' / Серия ' + element.episode;
          element.info = element.season ? ' / ' + Lampa.Utils.shortText(filter_items.voice[choice.voice], 50) : '';
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
          item.addClass('video--stream');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            var extra = getFile(element.file);

            if (extra.file) {
              var playlist = [];
              var first = {
                url: extra.file,
                quality: extra.quality,
                timeline: view,
                subtitles: element.subtitles,
                title: element.season ? element.title : object.movie.title + ' / ' + element.title
              };

              if (element.season) {
                items.forEach(function (elem) {
                  var ex = getFile(elem.file);
                  playlist.push({
                    title: elem.title,
                    url: ex.file,
                    quality: ex.quality,
                    subtitles: elem.subtitles,
                    timeline: elem.timeline
                  });
                });
              } else {
                playlist.push(first);
              }

              if (playlist.length > 1) first.playlist = playlist;
              Lampa.Player.play(first);
              Lampa.Player.playlist(playlist);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            } else Lampa.Noty.show('Не удалось извлечь ссылку');
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              call(getFile(element.file));
            }
          });
        });
        component.start(true);
      }
    }

    function filmix(component, _object) {
      var network = new Lampa.Reguest();
      var extract = {};
      var results = [];
      var object = _object;
      var embed = 'http://filmixapp.cyou/api/v2/';
      var select_title = '';
      var filter_items = {};
      var choice = {
        season: 0,
        voice: 0
      };
      var token = Lampa.Storage.get('filmix_token', '');

      if (!window.filmix) {
        window.filmix = {
          max_qualitie: 720,
          is_max_qualitie: false
        };
      }

      var dev_token = '?user_dev_apk=1.1.2&&user_dev_name=Xiaomi&user_dev_os=11&user_dev_token=' + token + '&user_dev_vendor=Xiaomi';
      /**
       * Начать поиск
       * @param {Object} _object 
       */

      this.search = function (_object, data) {
        var _this = this;

        if (this.wait_similars) return this.find(data[0].id);
        object = _object;
        select_title = object.movie.title;
        var item = data[0];
        var year = parseInt((object.movie.release_date || object.movie.first_air_date || '0000').slice(0, 4));
        var orig = object.movie.original_title || object.movie.original_name;
        var url = embed + 'suggest';
        url = Lampa.Utils.addUrlComponent(url, 'word=' + encodeURIComponent(item.title));
        network.clear();
        network.silent(url, function (json) {
          var cards = json.filter(function (c) {
            c.year = parseInt(c.alt_name.split('-').pop());
            return c.year > year - 2 && c.year < year + 2;
          });
          var card = cards.find(function (c) {
            return c.year == year;
          });

          if (!card) {
            card = cards.find(function (c) {
              return c.original_title == orig;
            });
          }

          if (!card && cards.length == 1) card = cards[0];
          if (card) _this.find(card.id);else if (json.length) {
            _this.wait_similars = true;
            component.similars(json);
            component.loading(false);
          } else component.empty('По запросу (' + select_title + ') нет результатов');
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        });
      };

      this.find = function (filmix_id) {
        var url = embed;

        if (!window.filmix.is_max_qualitie && token) {
          window.filmix.is_max_qualitie = true;
          network.clear();
          network.timeout(10000);
          network.silent(url + 'user_profile' + dev_token, function (found) {
            if (found && found.user_data) {
              if (found.user_data.is_pro) window.filmix.max_qualitie = 1080;
              if (found.user_data.is_pro_plus) window.filmix.max_qualitie = 2160;
            }

            end_search(filmix_id);
          });
        } else end_search(filmix_id);

        function end_search(filmix_id) {
          network.clear();
          network.timeout(10000);
          network.silent(window.filmix.is_max_qualitie ? url + 'post/' + filmix_id + dev_token : url + 'post/' + filmix_id, function (found) {
            if (found && Object.keys(found).length) {
              success(found);
              component.loading(false);
            } else component.empty('По запросу (' + select_title + ') нет результатов');
          }, function (a, c) {
            component.empty(network.errorDecode(a, c));
          });
        }
      };

      this.extendChoice = function (saved) {
        Lampa.Arrays.extend(choice, saved, true);
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
        extractData(results);
        filter();
        append(filtred());
        component.saveChoice(choice);
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
        extractData(results);
        filter();
        append(filtred());
        component.saveChoice(choice);
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
       * Получить информацию о фильме
       * @param {Arrays} data
       */


      function extractData(data) {
        extract = {};
        var pl_links = data.player_links;

        if (pl_links.playlist && Object.keys(pl_links.playlist).length > 0) {
          var seas_num = 0;

          for (var season in pl_links.playlist) {
            var episode = pl_links.playlist[season];
            ++seas_num;
            var transl_id = 0;

            for (var voice in episode) {
              var episode_voice = episode[voice];
              ++transl_id;
              var items = [];

              for (var ID in episode_voice) {
                var file_episod = episode_voice[ID];
                var quality_eps = file_episod.qualities.filter(function (qualitys) {
                  return qualitys <= window.filmix.max_qualitie;
                });
                var max_quality = Math.max.apply(null, quality_eps);
                var stream_url = file_episod.link.replace('%s.mp4', max_quality + '.mp4');
                var s_e = stream_url.slice(0 - stream_url.length + stream_url.lastIndexOf('/'));
                var str_s_e = s_e.match(/s(\d+)e(\d+?)_\d+\.mp4/i);

                if (str_s_e) {
                  var _seas_num = parseInt(str_s_e[1]);

                  var _epis_num = parseInt(str_s_e[2]);

                  items.push({
                    id: _seas_num + '_' + _epis_num,
                    comment: _epis_num + ' Серия <i>' + ID + '</i>',
                    file: stream_url,
                    episode: _epis_num,
                    season: _seas_num,
                    quality: max_quality,
                    qualities: quality_eps,
                    translation: transl_id
                  });
                }
              }

              if (!extract[transl_id]) extract[transl_id] = {
                json: [],
                file: ''
              };
              extract[transl_id].json.push({
                id: seas_num,
                comment: seas_num + ' сезон',
                folder: items,
                translation: transl_id
              });
            }
          }
        } else if (pl_links.movie && pl_links.movie.length > 0) {
          var _transl_id = 0;

          for (var _ID in pl_links.movie) {
            var _file_episod = pl_links.movie[_ID];
            ++_transl_id;

            var _quality_eps = _file_episod.link.match(/.+\[(.+[\d]),?\].+/i);

            if (_quality_eps) _quality_eps = _quality_eps[1].split(',').filter(function (quality_) {
              return quality_ <= window.filmix.max_qualitie;
            });

            var _max_quality = Math.max.apply(null, _quality_eps);

            var file_url = _file_episod.link.replace(/\[(.+[\d]),?\]/i, _max_quality);

            extract[_transl_id] = {
              file: file_url,
              translation: _file_episod.translation,
              quality: _max_quality,
              qualities: _quality_eps
            };
          }
        }
      }
      /**
       * Найти поток
       * @param {Object} element
       * @param {Int} max_quality
       * @returns string
       */


      function getFile(element, max_quality) {
        var translat = extract[element.translation];
        var id = element.season + '_' + element.episode;
        var file = '';
        var quality = false;

        if (translat) {
          if (element.season) for (var i in translat.json) {
            var elem = translat.json[i];
            if (elem.folder) for (var f in elem.folder) {
              var folder = elem.folder[f];

              if (folder.id == id) {
                file = folder.file;
                break;
              }
            } else {
              if (elem.id == id) {
                file = elem.file;
                break;
              }
            }
          } else file = translat.file;
        }

        max_quality = parseInt(max_quality);

        if (file) {
          var link = file.slice(0, file.lastIndexOf('_')) + '_';
          var orin = file.split('?');
          orin = orin.length > 1 ? '?' + orin.slice(1).join('?') : '';

          if (file.split('_').pop().replace('.mp4', '') !== max_quality) {
            file = link + max_quality + '.mp4' + orin;
          }

          quality = {};
          var mass = [2160, 1440, 1080, 720, 480, 360];
          mass = mass.slice(mass.indexOf(max_quality));
          mass.forEach(function (n) {
            quality[n + 'p'] = link + n + '.mp4' + orin;
          });
          var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
          if (quality[preferably]) file = quality[preferably];
        }

        return {
          file: file,
          quality: quality
        };
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

        if (results.last_episode && results.last_episode.season) {
          var s = results.last_episode.season;

          while (s--) {
            filter_items.season.push('Сезон ' + (results.last_episode.season - s));
          }
        }

        for (var Id in results.player_links.playlist) {
          var season = results.player_links.playlist[Id];
          var d = 0;

          for (var voic in season) {
            ++d;

            if (filter_items.voice.indexOf(voic) == -1) {
              filter_items.voice.push(voic);
              filter_items.voice_info.push({
                id: d
              });
            }
          }
        }

        component.filter(filter_items, choice);
      }
      /**
       * Отфильтровать файлы
       * @returns array
       */


      function filtred() {
        var filtred = [];
        var filter_data = Lampa.Storage.get('online_filter', '{}');

        if (Object.keys(results.player_links.playlist).length) {
          for (var transl in extract) {
            var element = extract[transl];

            for (var season_id in element.json) {
              var episode = element.json[season_id];

              if (episode.id == filter_data.season + 1) {
                episode.folder.forEach(function (media) {
                  if (media.translation == filter_items.voice_info[filter_data.voice].id) {
                    filtred.push({
                      episode: parseInt(media.episode),
                      season: media.season,
                      title: media.episode + (media.title ? ' - ' + media.title : ''),
                      quality: media.quality + 'p ',
                      translation: media.translation
                    });
                  }
                });
              }
            }
          }
        } else if (Object.keys(results.player_links.movie).length) {
          for (var transl_id in extract) {
            var _element = extract[transl_id];
            filtred.push({
              title: _element.translation,
              quality: _element.quality + 'p ',
              qualitys: _element.qualities,
              translation: transl_id
            });
          }
        }

        return filtred;
      }
      /**
       * Добавить видео
       * @param {Array} items 
       */


      function append(items) {
        component.reset();
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        items.forEach(function (element) {
          if (element.season) element.title = 'S' + element.season + ' / Серия ' + element.episode;
          element.info = element.season ? ' / ' + Lampa.Utils.shortText(filter_items.voice[choice.voice], 50) : '';
          var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var view = Lampa.Timeline.view(hash);
          var item = Lampa.Template.get('online', element);
          var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
          item.addClass('video--stream');
          element.timeline = view;
          item.append(Lampa.Timeline.render(view));

          if (Lampa.Timeline.details) {
            item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
          }

          if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
          item.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            var extra = getFile(element, element.quality);

            if (extra.file) {
              var playlist = [];
              var first = {
                url: extra.file,
                quality: extra.quality,
                timeline: view,
                title: element.season ? element.title : object.movie.title + ' / ' + element.title
              };

              if (element.season) {
                items.forEach(function (elem) {
                  var ex = getFile(elem, elem.quality);
                  playlist.push({
                    title: elem.title,
                    url: ex.file,
                    quality: ex.quality,
                    timeline: elem.timeline
                  });
                });
              } else {
                playlist.push(first);
              }

              if (playlist.length > 1) first.playlist = playlist;
              Lampa.Player.play(first);
              Lampa.Player.playlist(playlist);

              if (viewed.indexOf(hash_file) == -1) {
                viewed.push(hash_file);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', viewed);
              }
            } else Lampa.Noty.show('Не удалось извлечь ссылку');
          });
          component.append(item);
          component.contextmenu({
            item: item,
            view: view,
            viewed: viewed,
            hash_file: hash_file,
            file: function file(call) {
              call(getFile(element, element.quality));
            }
          });
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
      var last_bls = Lampa.Storage.cache('online_last_balanser', 200, {});

      if (last_bls[object.movie.id]) {
        balanser = last_bls[object.movie.id];
      }

      var sources = {
        videocdn: new videocdn(this, object),
        rezka: new rezka(this, object),
        kinobase: new kinobase(this, object),
        collaps: new collaps(this, object),
        cdnmovies: new cdnmovies(this, object),
        filmix: new filmix(this, object)
      };
      var last;
      var last_filter;
      var extended;
      var selected_id;
      var filter_translate = {
        season: 'Сезон',
        voice: 'Перевод',
        source: 'Источник'
      };
      var filter_sources = ['videocdn', 'rezka', 'kinobase', 'collaps', 'cdnmovies', 'filmix']; // шаловливые ручки

      if (filter_sources.indexOf(balanser) == -1) {
        balanser = 'videocdn';
        Lampa.Storage.set('online_balanser', 'videocdn');
      }

      if (window.innerWidth > 580) scroll.minus();else scroll.minus(files.render().find('.files__left'));
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
              if (extended) sources[balanser].reset();else _this.start();
            } else {
              sources[balanser].filter(type, a, b);
            }
          } else if (type == 'sort') {
            balanser = a.source;
            Lampa.Storage.set('online_balanser', balanser);
            last_bls[object.movie.id] = balanser;
            Lampa.Storage.set('online_last_balanser', last_bls);

            _this.search();

            setTimeout(Lampa.Select.close, 10);
          }
        };

        filter.render().find('.filter--sort span').text('Балансер');
        filter.render();
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

        var url = 'http://cdn.svetacdn.in/api/short';
        var query = object.search;
        url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');

        var display = function display(json) {
          if (object.movie.imdb_id) {
            var imdb = json.data.filter(function (elem) {
              return elem.imdb_id == object.movie.imdb_id;
            });
            if (imdb.length) json.data = imdb;
          }

          if (json.data && json.data.length) {
            if (json.data.length == 1 || object.clarification) {
              _this2.extendChoice();

              if (balanser == 'videocdn' || balanser == 'filmix') sources[balanser].search(object, json.data);else sources[balanser].search(object, json.data[0].kp_id || json.data[0].filmId, json.data);
            } else {
              _this2.similars(json.data);

              _this2.loading(false);
            }
          } else _this2.empty('По запросу (' + query + ') нет результатов');
        };

        var pillow = function pillow(a, c) {
          network.timeout(1000 * 15);

          if (balanser !== 'videocdn') {
            network["native"]('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(query), function (json) {
              json.data = json.films;
              display(json);
            }, function (a, c) {
              _this2.empty(network.errorDecode(a, c));
            }, false, {
              headers: {
                'X-API-KEY': '2d55adfd-019d-4567-bbf7-67d503f61b5a'
              }
            });
          } else {
            _this2.empty(network.errorDecode(a, c));
          }
        };

        var letgo = function letgo(imdb_id) {
          var url_end = Lampa.Utils.addUrlComponent(url, imdb_id ? 'imdb_id=' + encodeURIComponent(imdb_id) : 'title=' + encodeURIComponent(query));
          network.timeout(1000 * 15);
          network["native"](url_end, function (json) {
            if (json.data && json.data.length) display(json);else {
              network["native"](Lampa.Utils.addUrlComponent(url, 'title=' + encodeURIComponent(query)), display.bind(_this2), pillow.bind(_this2));
            }
          }, pillow.bind(_this2));
        };

        network.clear();
        network.timeout(1000 * 15);

        if (object.movie.imdb_id) {
          letgo(object.movie.imdb_id);
        } else if (object.movie.source == 'tmdb' || object.movie.source == 'cub') {
          network["native"]('http://' + (Lampa.Storage.field('proxy_tmdb') === false ? 'api.themoviedb.org' : 'apitmdb.cub.watch') + '/3/' + (object.movie.name ? 'tv' : 'movie') + '/' + object.movie.id + '/external_ids?api_key=4ef0d7355d9ffb5151e987764708ce96&language=ru', function (ttid) {
            letgo(ttid.imdb_id);
          }, function (a, c) {
            _this2.empty(network.errorDecode(a, c));
          });
        } else {
          letgo();
        }
      };

      this.extendChoice = function () {
        var data = Lampa.Storage.cache('online_choice_' + balanser, 500, {});
        var save = data[selected_id || object.movie.id] || {};
        extended = true;
        sources[balanser].extendChoice(save);
      };

      this.saveChoice = function (choice) {
        var data = Lampa.Storage.cache('online_choice_' + balanser, 500, {});
        data[selected_id || object.movie.id] = choice;
        Lampa.Storage.set('online_choice_' + balanser, data);
      };
      /**
       * Есть похожие карточки
       * @param {Object} json 
       */


      this.similars = function (json) {
        var _this3 = this;

        json.forEach(function (elem) {
          var year = elem.start_date || elem.year || '';
          elem.title = elem.title || elem.ru_title || elem.en_title || elem.nameRu || elem.nameEn;
          elem.quality = year ? (year + '').slice(0, 4) : '----';
          elem.info = '';
          var item = Lampa.Template.get('online_folder', elem);
          item.on('hover:enter', function () {
            _this3.activity.loader(true);

            _this3.reset();

            object.search_date = year;
            selected_id = elem.id;

            _this3.extendChoice();

            if (balanser == 'videocdn' || balanser == 'filmix') sources[balanser].search(object, [elem]);else sources[balanser].search(object, elem.kp_id || elem.filmId, [elem]);
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
        filter.set('filter', select);
        filter.set('sort', filter_sources.map(function (e) {
          return {
            title: e,
            source: e,
            selected: e == balanser
          };
        }));
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
          if (filter_items[i] && filter_items[i].length) {
            if (i == 'voice') {
              select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
            } else if (i !== 'source') {
              if (filter_items.season.length >= 1) {
                select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
              }
            }
          }
        }

        filter.chosen('filter', select);
        filter.chosen('sort', [balanser]);
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
       * Меню
       */


      this.contextmenu = function (params) {
        params.item.on('hover:long', function () {
          function show(extra) {
            var enabled = Lampa.Controller.enabled().name;
            var menu = [{
              title: 'Пометить',
              mark: true
            }, {
              title: 'Снять отметку',
              clearmark: true
            }, {
              title: 'Сбросить таймкод',
              timeclear: true
            }];

            if (Lampa.Platform.is('webos')) {
              menu.push({
                title: 'Запустить плеер - Webos',
                player: 'webos'
              });
            }

            if (Lampa.Platform.is('android')) {
              menu.push({
                title: 'Запустить плеер - Android',
                player: 'android'
              });
            }

            menu.push({
              title: 'Запустить плеер - Lampa',
              player: 'lampa'
            });

            if (extra) {
              menu.push({
                title: 'Копировать ссылку на видео',
                copylink: true
              });
            }

            Lampa.Select.show({
              title: 'Действие',
              items: menu,
              onBack: function onBack() {
                Lampa.Controller.toggle(enabled);
              },
              onSelect: function onSelect(a) {
                if (a.clearmark) {
                  Lampa.Arrays.remove(params.viewed, params.hash_file);
                  Lampa.Storage.set('online_view', params.viewed);
                  params.item.find('.torrent-item__viewed').remove();
                }

                if (a.mark) {
                  if (params.viewed.indexOf(params.hash_file) == -1) {
                    params.viewed.push(params.hash_file);
                    params.item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                    Lampa.Storage.set('online_view', params.viewed);
                  }
                }

                if (a.timeclear) {
                  params.view.percent = 0;
                  params.view.time = 0;
                  params.view.duration = 0;
                  Lampa.Timeline.update(params.view);
                }

                Lampa.Controller.toggle(enabled);

                if (a.player) {
                  Lampa.Player.runas(a.player);
                  params.item.trigger('hover:enter');
                }

                if (a.copylink) {
                  if (extra.quality) {
                    var qual = [];

                    for (var i in extra.quality) {
                      qual.push({
                        title: i,
                        file: extra.quality[i]
                      });
                    }

                    Lampa.Select.show({
                      title: 'Ссылки',
                      items: qual,
                      onBack: function onBack() {
                        Lampa.Controller.toggle(enabled);
                      },
                      onSelect: function onSelect(b) {
                        Lampa.Utils.copyTextToClipboard(b.file, function () {
                          Lampa.Noty.show('Ссылка скопирована в буфер обмена');
                        }, function () {
                          Lampa.Noty.show('Ошибка при копирование ссылки');
                        });
                      }
                    });
                  } else {
                    Lampa.Utils.copyTextToClipboard(extra.file, function () {
                      Lampa.Noty.show('Ссылка скопирована в буфер обмена');
                    }, function () {
                      Lampa.Noty.show('Ошибка при копирование ссылки');
                    });
                  }
                }
              }
            });
          }

          params.file(show);
        }).on('hover:focus', function () {
          if (Lampa.Helper) Lampa.Helper.show('online_file', 'Удерживайте клавишу (ОК) для вызова контекстного меню', params.item);
        });
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
        if (Lampa.Activity.active().activity !== this.activity) return; //обязательно, иначе наблюдается баг, активность создается но не стартует, в то время как компонент загружается и стартует самого себя.

        if (first_select) {
          var last_views = scroll.render().find('.selector.video--stream').find('.torrent-item__viewed').parent().last();
          if (object.movie.number_of_seasons && last_views.length) last = last_views.eq(0)[0];else last = scroll.render().find('.selector').eq(3)[0];
        }

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
            if (Navigator.canmove('right')) Navigator.move('right');else filter.show('Фильтр', 'filter');
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
        sources.kinobase.destroy();
        sources.collaps.destroy();
        sources.cdnmovies.destroy();
        sources.filmix.destroy();
      };
    }

    function resetTemplates() {
      Lampa.Template.add('online', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"64\" cy=\"64\" r=\"56\" stroke=\"white\" stroke-width=\"16\"/>\n                    <path d=\"M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
      Lampa.Template.add('online_folder', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"/>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"/>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
    }

    var button = "<div class=\"full-start__button selector view--online\" data-subtitle=\"\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B \u0441 pastebin v1.48\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 30.051 30.051\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M19.982,14.438l-6.24-4.536c-0.229-0.166-0.533-0.191-0.784-0.062c-0.253,0.128-0.411,0.388-0.411,0.669v9.069   c0,0.284,0.158,0.543,0.411,0.671c0.107,0.054,0.224,0.081,0.342,0.081c0.154,0,0.31-0.049,0.442-0.146l6.24-4.532   c0.197-0.145,0.312-0.369,0.312-0.607C20.295,14.803,20.177,14.58,19.982,14.438z\" fill=\"currentColor\"/>\n        <path d=\"M15.026,0.002C6.726,0.002,0,6.728,0,15.028c0,8.297,6.726,15.021,15.026,15.021c8.298,0,15.025-6.725,15.025-15.021   C30.052,6.728,23.324,0.002,15.026,0.002z M15.026,27.542c-6.912,0-12.516-5.601-12.516-12.514c0-6.91,5.604-12.518,12.516-12.518   c6.911,0,12.514,5.607,12.514,12.518C27.541,21.941,21.937,27.542,15.026,27.542z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>\u041E\u043D\u043B\u0430\u0439\u043D</span>\n    </div>"; // нужна заглушка, а то при страте лампы говорит пусто

    Lampa.Component.add('online', component); //то же самое

    resetTemplates();
    Lampa.Listener.follow('full', function (e) {
      if (e.type == 'complite') {
        var btn = $(button);
        btn.on('hover:enter', function () {
          resetTemplates();
          Lampa.Component.add('online', component);
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
    }); ///////FILMIX/////////

    var network = new Lampa.Reguest();
    var api_url = 'http://filmixapp.cyou/api/v2/';
    var user_dev = '?user_dev_apk=1.1.3&user_dev_id=' + Lampa.Utils.uid(16) + '&user_dev_name=Xiaomi&user_dev_os=11&user_dev_vendor=Xiaomi&user_dev_token=';
    var ping_auth;
    Lampa.Params.select('filmix_token', '', '');
    Lampa.Template.add('settings_filmix', "<div>\n    <div class=\"settings-param selector\" data-name=\"filmix_token\" data-type=\"input\" placeholder=\"\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: nxjekeb57385b..\">\n        <div class=\"settings-param__name\">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0422\u041E\u041A\u0415\u041D \u043E\u0442 Filmix</div>\n        <div class=\"settings-param__value\"></div>\n        <div class=\"settings-param__descr\">\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0422\u041E\u041A\u0415\u041D \u0434\u043B\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438</div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"filmix_add\" data-static=\"true\">\n        <div class=\"settings-param__name\">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0430 Filmix</div>\n    </div>\n</div>");
    Lampa.Storage.listener.follow('change', function (e) {
      if (e.name == 'filmix_token') {
        if (e.value) checkPro(e.value);else {
          Lampa.Storage.set("filmix_status", {});
          showStatus();
        }
      }
    });
    Lampa.Listener.follow('app', function (e) {
      if (e.type == 'ready' && Lampa.Settings.main && !Lampa.Settings.main().render().find('[data-component="filmix"]').length) {
        var field = $("<div class=\"settings-folder selector\" data-component=\"filmix\">\n            <div class=\"settings-folder__icon\">\n                <svg height=\"44\" viewBox=\"0 0 27 44\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M0 10.1385V44H9.70312V29.0485H23.7656V19.2233H9.70312V15.6634C9.70312 11.8188 12.6562 9.39806 15.8906 9.39806H27V0H9.70312C5.20312 0 0 3.41748 0 10.1385Z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"settings-folder__name\">Filmix</div>\n        </div>");
        Lampa.Settings.main().render().find('[data-component="more"]').after(field);
        Lampa.Settings.main().update();
      }
    });
    Lampa.Settings.listener.follow('open', function (e) {
      if (e.name == 'filmix') {
        e.body.find('[data-name="filmix_add"]').unbind('hover:enter').on('hover:enter', function () {
          var user_code = '';
          var user_token = '';
          var modal = $('<div><div class="broadcast__text">Введите его на странице https://filmix.ac/consoles в вашем авторизованном аккаунте!</div><div class="broadcast__device selector" style="text-align: center">Ожидаем код...</div><br><div class="broadcast__scan"><div></div></div></div></div>');
          Lampa.Modal.open({
            title: '',
            html: modal,
            onBack: function onBack() {
              Lampa.Modal.close();
              Lampa.Controller.toggle('settings_component');
              clearInterval(ping_auth);
            },
            onSelect: function onSelect() {
              Lampa.Utils.copyTextToClipboard(user_code, function () {
                Lampa.Noty.show('Код скопирован в буфер обмена');
              }, function () {
                Lampa.Noty.show('Ошибка при копировании');
              });
            }
          });
          ping_auth = setInterval(function () {
            checkPro(user_token, function () {
              Lampa.Modal.close();
              clearInterval(ping_auth);
              Lampa.Storage.set("filmix_token", user_token);
              e.body.find('[data-name="filmix_token"] .settings-param__value').text(user_token);
              Lampa.Controller.toggle('settings_component');
            });
          }, 10000);
          network.clear();
          network.timeout(10000);
          network.quiet(api_url + 'token_request' + user_dev, function (found) {
            if (found.status == 'ok') {
              user_token = found.code;
              user_code = found.user_code;
              modal.find('.selector').text(user_code); //modal.find('.broadcast__scan').remove()
            } else {
              Lampa.Noty.show(found);
            }
          }, function (a, c) {
            Lampa.Noty.show(network.errorDecode(a, c));
          });
        });
        showStatus();
      }
    });

    function showStatus() {
      var status = Lampa.Storage.get("filmix_status", '{}');
      var info = 'Устройство не авторизовано';

      if (status.login) {
        if (status.is_pro) info = status.login + ' - PRO до - ' + status.pro_date;else if (status.is_pro_plus) info = status.login + ' - PRO_PLUS до - ' + status.pro_date;else info = status.login + ' - NO PRO';
      }

      var field = $("\n        <div class=\"settings-param\" data-name=\"filmix_status\" data-static=\"true\">\n            <div class=\"settings-param__name\">\u0421\u0442\u0430\u0442\u0443\u0441</div>\n            <div class=\"settings-param__value\">".concat(info, "</div>\n        </div>"));
      $('.settings [data-name="filmix_status"]').remove();
      $('.settings [data-name="filmix_add"]').after(field);
    }

    function checkPro(token, call) {
      network.clear();
      network.timeout(8000);
      network.silent(api_url + 'user_profile' + user_dev + token, function (json) {
        if (json) {
          if (json.user_data) {
            Lampa.Storage.set("filmix_status", json.user_data);
            if (call) call();
          } else {
            Lampa.Storage.set("filmix_status", {});
          }

          showStatus();
        }
      }, function (a, c) {
        Lampa.Noty.show(network.errorDecode(a, c));
      });
    }

})();