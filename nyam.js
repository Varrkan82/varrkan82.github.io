(function () {
    'use strict';

    var network = new Lampa.Reguest();

    function sourceTitle(title) {
      return Lampa.Utils.capitalizeFirstLetter(title.split('.')[0]);
    }

    function isVIP(element) {
      return /vip.mp4/.test(element.video);
    }

    function modal() {
      var id = Lampa.Storage.get('sisi_unic_id', '').toLowerCase();
      var controller = Lampa.Controller.enabled().name;
      var content = "<div class=\"about\">\n        <div>\u042D\u0442\u043E \u0432\u0438\u0434\u0435\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0441 VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439. \u0414\u043B\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438, \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442 \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0443\u043A\u0430\u0437\u0430\u043D \u043D\u0438\u0436\u0435 \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448 ID</div>\n        <div class=\"about__contacts\">\n            <div>\n                <small>\u0421\u0430\u0439\u0442</small><br>\n                ".concat(window.plugin_sisi_vip_site, "\n            </div>\n\n            <div>\n                <small>\u0412\u0430\u0448 ID</small><br>\n                ").concat(id, "\n            </div>\n        </div>\n    </div>");
      Lampa.Modal.open({
        title: 'VIP Контент',
        html: $(content),
        size: 'medium',
        onBack: function onBack() {
          Lampa.Modal.close();
          Lampa.Controller.toggle(controller);
        }
      });
    }

    function qualityDefault(qualitys) {
      var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
      var url;

      if (qualitys) {
        for (var q in qualitys) {
          if (q.indexOf(preferably) == 0) url = qualitys[q];
        }

        if (!url) url = qualitys[Lampa.Arrays.getKeys(qualitys)[0]];
      }

      return url;
    }

    function play(element) {
      var controller_enabled = Lampa.Controller.enabled().name;

      if (isVIP(element)) {
        return modal();
      }

      if (element.json) {
        Lampa.Loading.start(function () {
          network.clear();
          Lampa.Loading.stop();
        });
        network["native"](Api$1.account(element.video + '&json=true'), function (qualitys) {
          Lampa.Loading.stop();

          for (var i in qualitys) {
            qualitys[i] = Api$1.account(qualitys[i]);
          }

          var video = {
            title: element.name,
            url: Api$1.account(qualityDefault(qualitys)),
            quality: qualitys
          };
          Lampa.Player.play(video);
          Lampa.Player.playlist([video]);
          Lampa.Player.callback(function () {
            Lampa.Controller.toggle(controller_enabled);
          });
        }, function () {
          Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
        });
      } else {
        if (element.qualitys) {
          for (var i in element.qualitys) {
            element.qualitys[i] = Api$1.account(element.qualitys[i]);
          }
        }

        var video = {
          title: element.name,
          url: Api$1.account(qualityDefault(element.qualitys) || element.video),
          quality: element.qualitys
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
        Lampa.Player.callback(function () {
          Lampa.Controller.toggle(controller_enabled);
        });
      }
    }

    function fixCards(json) {
      json.forEach(function (m) {
        m.background_image = m.picture;
        m.poster = m.picture;
        m.img = m.picture;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name).replace(/\&(.*?);/g, '');
      });
    }

    var Utils = {
      sourceTitle: sourceTitle,
      play: play,
      fixCards: fixCards,
      isVIP: isVIP
    };

    var menu;

    function Api() {
      var _this = this;

      var network = new Lampa.Reguest();

      this.menu = function (success, error) {
        if (menu) return success(menu);
        network.silent(this.account(window.plugin_sisi_localhost), function (data) {
          if (data.channels) {
            menu = data.channels;
            success(menu);
          } else {
            error(data.msg);
          }
        }, error);
      };

      this.view = function (params, success, error) {
        var u = Lampa.Utils.addUrlComponent(params.url, 'pg=' + (params.page || 1));
        network.silent(this.account(u), function (json) {
          if (json.list) {
            json.results = json.list;
            json.collection = true;
            json.total_pages = json.total_pages || 30;
            Utils.fixCards(json.results);
            delete json.list;
            success(json);
          } else {
            error();
          }
        }, error);
      };

      this.account = function (u) {
        var unic_id = Lampa.Storage.get('sisi_unic_id', '');
        var email = Lampa.Storage.get('account', {}).email;
        if (u.indexOf('box_mac=') == -1) u = Lampa.Utils.addUrlComponent(u, 'box_mac=' + unic_id);else u = u.replace(/box_mac=[^&]+/, 'box_mac=' + unic_id);

        if (email) {
          if (u.indexOf('account_email=') == -1) u = Lampa.Utils.addUrlComponent(u, 'account_email=' + encodeURIComponent(email));else u = u.replace(/account_email=[^&]+/, 'account_email=' + encodeURIComponent(email));
        }

        return u;
      };

      this.playlist = function (add_url_query, oncomplite, error) {
        var load = function load() {
          var status = new Lampa.Status(menu.length);

          status.onComplite = function (data) {
            var items = [];
            menu.forEach(function (m) {
              if (data[m.playlist_url] && data[m.playlist_url].results.length) items.push(data[m.playlist_url]);
            });
            if (items.length) oncomplite(items);else error();
          };

          menu.forEach(function (m) {
            network.silent(_this.account(m.playlist_url + add_url_query), function (json) {
              if (json.list) {
                json.title = Utils.sourceTitle(m.title);
                json.results = json.list;
                json.url = m.playlist_url;
                json.collection = true;
                json.line_type = 'none';
                json.card_events = {
                  onMenu: function onMenu() {},
                  onEnter: function onEnter(card, element) {
                    Utils.play(element);
                  }
                };
                Utils.fixCards(json.results);
                delete json.list;
                status.append(m.playlist_url, json);
              } else {
                status.error();
              }
            }, status.error.bind(status));
          });
        };

        if (menu) load();else {
          _this.menu(load, error);
        }
      };

      this.main = function (params, oncomplite, error) {
        this.playlist('', oncomplite, error);
      };

      this.search = function (params, oncomplite, error) {
        this.playlist('?search=' + encodeURIComponent(params.query), oncomplite, error);
      };

      this.clear = function () {
        network.clear();
      };
    }

    var Api$1 = new Api();

    function Sisi(object) {
      var comp = new Lampa.InteractionMain(object);

      comp.create = function () {
        this.activity.loader(true);
        Api$1.main(object, this.build.bind(this), this.empty.bind(this));
        return this.render();
      };

      comp.empty = function (er) {
        var _this = this;

        var empty = new Lampa.Empty({
          descr: typeof er == 'string' ? er : Lampa.Lang.translate('empty_text_two')
        });
        Lampa.Activity.all().forEach(function (active) {
          if (_this.activity == active.activity) active.activity.render().find('.activity__body > div')[0].appendChild(empty.render(true));
        });
        this.start = empty.start;
        this.activity.loader(false);
        this.activity.toggle();
      };

      comp.onMore = function (data) {
        Lampa.Activity.push({
          url: data.url,
          title: data.title,
          component: 'sisi_view',
          page: 2
        });
      };

      return comp;
    }

    function View(object) {
      var comp = new Lampa.InteractionCategory(object);
      var menu;

      comp.create = function () {
        var _this = this;

        this.activity.loader(true);
        Api$1.view(object, function (data) {
          menu = data.menu;

          if (menu) {
            menu.forEach(function (m) {
              var spl = m.title.split(':');
              m.title = spl[0].trim();
              if (spl[1]) m.subtitle = Lampa.Utils.capitalizeFirstLetter(spl[1].trim().replace(/all/i, 'Любой'));

              if (m.submenu) {
                m.submenu.forEach(function (s) {
                  s.title = Lampa.Utils.capitalizeFirstLetter(s.title.trim().replace(/all/i, 'Любой'));
                });
              }
            });
          }

          _this.build(data);
        }, this.empty.bind(this));
      };

      comp.nextPageReuest = function (object, resolve, reject) {
        Api$1.view(object, resolve.bind(this), reject.bind(this));
      };

      comp.cardRender = function (object, element, card) {
        card.onMenu = function () {};

        card.onEnter = function () {
          Utils.play(element);
        };
      };

      comp.filter = function () {
        if (menu) {
          var items = menu.filter(function (m) {
            return !m.search_on;
          });
          if (!items.length) return;
          Lampa.Select.show({
            title: 'Фильтр',
            items: items,
            onBack: function onBack() {
              Lampa.Controller.toggle('content');
            },
            onSelect: function onSelect(a) {
              menu.forEach(function (m) {
                m.selected = m == a ? true : false;
              });

              if (a.submenu) {
                Lampa.Select.show({
                  title: a.title,
                  items: a.submenu,
                  onBack: function onBack() {
                    comp.filter();
                  },
                  onSelect: function onSelect(b) {
                    Lampa.Activity.push({
                      title: object.title,
                      url: b.playlist_url,
                      component: 'sisi_view',
                      page: 1
                    });
                  }
                });
              } else {
                comp.filter();
              }
            }
          });
        }
      };

      comp.onRight = comp.filter.bind(comp);
      return comp;
    }

    function startPlugin() {
      window.plugin_sisi_ready = true;
      window.plugin_sisi_localhost = './ch';
      window.plugin_sisi_vip_site = 'http://sisi.am/vip';
      var unic_id = Lampa.Storage.get('sisi_unic_id', '');

      if (!unic_id) {
        unic_id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('sisi_unic_id', unic_id);
      }

      Lampa.Component.add('sisi', Sisi);
      Lampa.Component.add('sisi_view', View); //Lampa.Search.addSource(Search)

      function addFilter() {
        var activi;
        var timer;
        var button = $("<div class=\"head__action head__settings selector\">\n            <svg height=\"36\" viewBox=\"0 0 38 36\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <rect x=\"1.5\" y=\"1.5\" width=\"35\" height=\"33\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"3\"></rect>\n                <rect x=\"7\" y=\"8\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <rect x=\"7\" y=\"16\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <rect x=\"7\" y=\"25\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <circle cx=\"13.5\" cy=\"17.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n                <circle cx=\"23.5\" cy=\"26.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n                <circle cx=\"21.5\" cy=\"9.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n            </svg>\n        </div>");
        button.hide().on('hover:enter', function () {
          if (activi) {
            activi.activity.component().filter();
          }
        });
        $('.head .open--search').after(button);
        Lampa.Listener.follow('activity', function (e) {
          if (e.type == 'start') activi = e.object;
          clearTimeout(timer);
          timer = setTimeout(function () {
            if (activi) {
              if (activi.component !== 'sisi_view') {
                button.hide();
                activi = false;
              }
            }
          }, 1000);

          if (e.type == 'start' && e.component == 'sisi_view') {
            button.show();
            activi = e.object;
          }
        });
      }

      function add() {
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg width=\"200\" height=\"243\" viewBox=\"0 0 200 243\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z\" stroke=\"currentColor\" stroke-width=\"15\"/><rect x=\"39.0341\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"90.8467\" y=\"92.0388\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"140.407\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"116.753\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"64.9404\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"93.0994\" y=\"176.021\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/></svg>\n            </div>\n            <div class=\"menu__text\">\u041A\u043B\u0443\u0431\u043D\u0438\u0447\u043A\u0430</div>\n        </li>");
        button.on('hover:enter', function () {
          Api$1.menu(function (data) {
            var items = [{
              title: 'Все'
            }];
            data.forEach(function (a) {
              a.title = Utils.sourceTitle(a.title);
            });
            items = items.concat(data);
            Lampa.Select.show({
              title: 'Сайты',
              items: items,
              onSelect: function onSelect(a) {
                if (a.playlist_url) {
                  Lampa.Activity.push({
                    url: a.playlist_url,
                    title: a.title,
                    component: 'sisi_view',
                    page: 1
                  });
                } else {
                  Lampa.Activity.push({
                    url: '',
                    title: 'Клубничка',
                    component: 'sisi',
                    page: 1
                  });
                }
              },
              onBack: function onBack() {
                Lampa.Controller.toggle('menu');
              }
            });
          }, function () {});
        });
        $('.menu .menu__list').eq(0).append(button);
        addFilter(); //addSettings()
      }

      if (window.appready) add();else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type == 'ready') add();
        });
      }
    }

    if (!window.plugin_sisi_ready) startPlugin();

})();
