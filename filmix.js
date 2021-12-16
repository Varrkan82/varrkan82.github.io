(function() {
    'use strict';

    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var files = new Lampa.Files(object);
        var filter = new Lampa.Filter(object);
        var results = [];
        var filtred = [];
        var extract = {};
        var last;
        var list;
        var ozvuk;
        var filmixq
        var filmname;
        var link1080p;
        var result_film;
        var last_filter;
      scroll.minus();
      scroll.body().addClass('torrent-list');
        this.create = function() { 
            var _this = this;

            this.activity.loader(true);
            Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie));

            filmname = encodeURIComponent(object.search)
            var url = 'http://arkmv.ru/api.php?search=' + filmname;
            var xhr = new XMLHttpRequest();
            var xhr1 = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.send();
            
            xhr.onload = function() {
                var results_films = xhr.responseText;
                    var link = results_films.match("http(.*?)mp4");
                    var voice = results_films.match("<title>(.*?)]");
                    var quality = results_films.match("Смотреть в качестве(.*?)]");
                    filmixq = quality[1];
                    ozvuk = voice[1];
                    link1080p = link[0];
            xhr1.open('GET', 'http://arkmv.ru/api.php?check=' + link1080p, true);
            xhr1.send();
             };
            xhr1.onload = function() {
                        if (xhr1.responseText == 200) {
                            link1080p = link1080p; 
                    _this.build();
                    _this.activity.loader(false);
                    _this.activity.toggle();}
                        else { 
                            link1080p = link1080p.replace(/2160.mp4/, '1440.mp4');
                            var results_films = xhr.responseText;
                            filmixq = '1080 Ultra+';
                    _this.build();
                    _this.activity.loader(false);
                    _this.activity.toggle();}
           }};
        this.buildFilterd = function(select_season) {

            var select = [];

            var add = function add(type, title) {
                var need = Lampa.Storage.get('online_filter', '{}');
                var items = filter_items[type];
                var subitems = [];
                var value = need[type];
                items.forEach(function(name, i) {
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
            var choice = {
                season: 0,
                voice: 0
            };
            results.slice(0, 1).forEach(function(movie) {
                if (movie.season_count) {
                    var s = movie.season_count;

                    while (s--) {
                        filter_items.season.push('Сезон ' + (movie.season_count - s));
                    }

                    choice.season = typeof select_season == 'undefined' ? filter_items.season.length - 1 : select_season;
                }

                if (filter_items.season.length) {
                    movie.episodes.forEach(function(episode) {
                        if (episode.season_num == choice.season + 1) {
                            episode.media.forEach(function(media) {
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
                    movie.translations.forEach(function(element) {
                        filter_items.voice.push('default');
                        filter_items.voice_info.push({
                            id: 0
                        });
                    });
                }
            });
            Lampa.Storage.set('online_filter', object.movie.number_of_seasons ? choice : {});
            select.push({
                title: 'Сбросить фильтр',
                reset: true
            });

            if (object.movie.number_of_seasons) {
                add('voice', 'Перевод');
                add('season', 'Сезон');
            }

            filter.set('filter', select);
            this.selectedFilter();
        };

        this.selectedFilter = function() {
            var need = Lampa.Storage.get('online_filter', '{}'),
                select = [];

            for (var i in need) {
                select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
            }

            filter.chosen('filter', select);
        };


        this.build = function() {
            var _this3 = this;

            this.filtred(); //Основной список

            _this3.start();

            this.showResults();
        };
        this.filtred = function() {
            filtred = [];
            var filter_data = Lampa.Storage.get('online_filter', '{}');

            if (object.movie.number_of_seasons) {
                results.slice(0, 1).forEach(function(movie) {
                    movie.episodes.forEach(function(episode) {
                        if (episode.season_num == filter_data.season + 1) {
                            episode.media.forEach(function(media) {
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
                filtred.push({
                    title: ozvuk, //Озвучка
                    quality: filmixq,
                    translation: 0
                });
            }
        };

        this.applyFilter = function() {
            this.filtred();
            this.selectedFilter();
            this.reset();
            this.showResults();
            last = scroll.render().find('.torrent-item:eq(0)')[0];
        };

        this.showResults = function(data) {
            filter.render().addClass('torrent-filter');
            scroll.append(filter.render());
            this.append(filtred);
            files.append(scroll.render());
        };

        this.reset = function() {
            last = false;
            filter.render().detach();
            scroll.clear();
        };

        this.getFile = function(element, max_quality, show_error) {
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
            file = link1080p;
            return file;
        };
        this.append = function(items) {
            var _this4 = this;

            items.forEach(function(element) {
                var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
                var view = Lampa.Timeline.view(hash);
                var item = Lampa.Template.get('online_ARKMV', element);
                item.append(Lampa.Timeline.render(view));
                item.on('hover:focus', function(e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                }).on('hover:enter', function() {
                    if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);

                    var file = _this4.getFile(element, element.quality, true);
                    if (file) {
                        _this4.start();

                        var playlist = [];
                        var first = {
                            url: file,
                            timeline: view,
                            title: element.season ? element.title : object.movie.title + ' / ' + element.title
                        };
                        Lampa.Player.play(first);

                        if (element.season) {
                            items.forEach(function(elem) {
                                playlist.push({
                                    title: elem.title,
                                    url: _this4.getFile(elem, elem.quality)
                                });
                            });
                        } else {
                            playlist.push(first);
                        }

                        Lampa.Player.playlist(playlist);
                    }
                });
                scroll.append(item);
            });
        };

        this.back = function() {
            Lampa.Activity.backward();
        };

        this.start = function() {
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
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function() {};

        this.stop = function() {};

        this.render = function() {
            return files.render();
        };

        this.destroy = function() {
            network.clear();
            files.destroy();
            scroll.destroy();
            results = null;
            network = null;
        };
    }

    function startPlugin() {
        window.plugin_ARKMV_ready = true;
        Lampa.Component.add('ARKMV', component);
        Lampa.Template.add('button_ARKMV', "<div class=\"full-start__button selector view--online\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 30.051 30.051\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M19.982,14.438l-6.24-4.536c-0.229-0.166-0.533-0.191-0.784-0.062c-0.253,0.128-0.411,0.388-0.411,0.669v9.069   c0,0.284,0.158,0.543,0.411,0.671c0.107,0.054,0.224,0.081,0.342,0.081c0.154,0,0.31-0.049,0.442-0.146l6.24-4.532   c0.197-0.145,0.312-0.369,0.312-0.607C20.295,14.803,20.177,14.58,19.982,14.438z\" fill=\"currentColor\"/>\n        <path d=\"M15.026,0.002C6.726,0.002,0,6.728,0,15.028c0,8.297,6.726,15.021,15.026,15.021c8.298,0,15.025-6.725,15.025-15.021   C30.052,6.728,23.324,0.002,15.026,0.002z M15.026,27.542c-6.912,0-12.516-5.601-12.516-12.514c0-6.91,5.604-12.518,12.516-12.518   c6.911,0,12.514,5.607,12.514,12.518C27.541,21.941,21.937,27.542,15.026,27.542z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>FILMIX</span>\n    </div>");
        Lampa.Template.add('online_ARKMV', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div class=\"online__title\">{title}</div>\n            <div class=\"online__quality\">Filmix /{quality}</div>\n        </div>\n    </div>");
        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                var btn = Lampa.Template.get('button_ARKMV');
                btn.on('hover:enter', function() {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Filmix',
                        component: 'ARKMV',
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

    if (!window.plugin_ARKMV_ready) startPlugin();

})();
