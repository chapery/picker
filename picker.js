(function () {
    var event = function () {
        var that = this;
        var stack = {};

        return {
            stack: stack,

            on: function (type, callback) {
                var stackCurrent = stack[type] || [];
                stackCurrent.push(callback);

                stack[type] = stackCurrent;
            },

            trigger: function (type) {
                var callbackArguments = [].slice.call(arguments, 1);
                var stackCurrent = stack[type] || [];

                stackCurrent.forEach(function (callback) {
                    callback.apply(that, callbackArguments);
                });
            }
        }
    };

    var Picker = function (target, config) {
        this.elTarget = typeof target === 'string' ? document.querySelector(target) : target;
        this.config = config;
        this.elPicker = null;
        this.elColumnsWrap = null;
        this.event = event.apply(this, arguments);

        // 允许超出滚动边界的最大距离
        this.flexableDistance = 100;

        if (['date', 'datetime'].indexOf(this.config.type) > -1) {
            this.date();
        }

        // 存放每列相关属性
        this.columns = this.config.columns.map(function (column) {
            var result = {
                config: column,
                elColumn: null,
                elScroll: null,
                elList: null,
                elItems: null,

                // 是否处于触控状态
                touchActive: false,
                startY: 0,

                // picker-list translateY
                translateY: 0,

                // 处于touch状态下的translateY
                touchTranslateY: 0,

                // 是否正在进行惯性滚动
                inertiaActive: false,

                /**
                 * 最后五次touchmove点
                 * clientY
                 * timeStamp
                 */
                lastTouchMovePoints: [],
                // 当前选中项索引
                activeIndex: 0
            }

            column.options.some(function (option, optionIndex) {
                if (option.key === column.selected) {
                    result.activeIndex = optionIndex;

                    return true;
                }
            });

            return result;
        });

        // touch状态下的column
        this.activeColumn = null;

        // picker是否处于显示状态
        this.active = false;

        this.createDom();
        this.createColumns();
        this.layout();
        this.bindEvent();
    }

    Picker.prototype = {

        consturctor: Picker,

        /**
         * 显示或隐藏picker
         * @param {Boolean} isShow 可选 是否显示，无此参数时取当前相反的状态
         */
        toggle: function (isShow) {
            var that = this;

            if (typeof isShow === 'undefined') {
                isShow = !this.active;
            }

            if (isShow) {
                this.elPicker.classList.add('active');
                setTimeout(function () {
                    that.elPicker.classList.add('transition');
                }, 0);
            } else {
                this.elPicker.classList.remove('transition');
                setTimeout(function () {
                    that.elPicker.classList.remove('active');
                }, 300);
            }

            this.active = isShow;
        },

        createDom: function () {
            var elMask = document.createElement('div');
            var template = '<div class="picker-container">\
                <div class="picker-operate">\
                    <div class="picker-cancel">取消</div>\
                    <div class="picker-confirm">确认</div>\
                </div>\
                <div class="picker-box">\
                    <div class="picker-columns">\
                    </div>\
                </div>\
            </div>';

            elMask.className = 'picker-mask';
            elMask.innerHTML = template;

            document.body.appendChild(elMask);

            this.elPicker = elMask;
            this.elColumnsWrap = elMask.querySelector('.picker-columns');
        },

        /**
         * 生成列
         */
        createColumns: function () {
            var that = this;

            that.config.columns.forEach(function (column, columnIndex) {
                var activeColumn = that.columns[columnIndex];
                var elColumn = document.createElement('div');
                var elScroll = null;
                var elList = null;
                var elItems = null;

                var itemsHtml = column.options.map(function (item) {
                    return '<div class="picker-item">' + (typeof item.value === 'undefined' ? '' : item.value) + '</div>';
                }).join('');
                var columnHtml = '<div class="picker-scroll" data-column-index="' + columnIndex + '">\
                                    <div class="picker-list">' + itemsHtml + '</div>\
                                    <div class="picker-view"></div>\
                                </div>\
                                <div class="picker-label">' + (typeof column.label === 'undefined' ? '' : column.label) + '</div>';

                elColumn.className = 'picker-column';
                elColumn.innerHTML = columnHtml;

                that.elColumnsWrap.appendChild(elColumn);

                elScroll = elColumn.querySelector('.picker-scroll');
                elList = elScroll.querySelector('.picker-list');
                elItems = [].slice.call(elList.querySelectorAll('.picker-item'));

                activeColumn.elColumn = elColumn;
                activeColumn.elScroll = elScroll;
                activeColumn.elList = elList;
                activeColumn.elItems = elItems;
            });

        },

        bindEvent: function () {
            var that = this;

            this.elTarget.addEventListener('click', function (e) {
                that.toggle(true);
            }, false);

            this.elPicker.addEventListener('click', function (e) {
                if (e.currentTarget === e.target) {
                    that.toggle(false);
                }
            }, false);

            this.elPicker.querySelector('.picker-cancel').addEventListener('click', function (e) {
                that.toggle(false);
            }, false);

            this.elPicker.querySelector('.picker-confirm').addEventListener('click', function () {
                var result = that.config.columns.map(function (column, columnIndex) {

                    return column.options[that.columns[columnIndex].activeIndex];
                });

                that.elTarget.value = result.map(function (item) {

                    return item.value;
                }).join(',');

                that.elTarget.dataset.value = result.map(function (item) {

                    return item.key;
                }).join(',');

                that.event.trigger('confirm', that.elTarget, result);
                that.toggle();
            }, false);

            this.columns.forEach(function (column) {
                column.elScroll.addEventListener('touchstart', that.touchStart.bind(that), false);
                column.elScroll.addEventListener('touchend', that.touchEnd.bind(that), false);
                column.elScroll.addEventListener('touchmove', that.touchMove.bind(that), false);
            });

            for (var key in that.config.on) {
                that.event.on(key, that.config.on[key]);
            }
        },

        layout: function () {
            var that = this;

            this.elPicker.classList.add('active');
            this.columns.forEach(function (column, columnIndex) {
                var configColumn = that.config.columns[columnIndex];
                var itemActiveIndex = 0;

                configColumn.options.some(function (option, optionIndex) {
                    if (option.key === configColumn.selected) {
                        itemActiveIndex = optionIndex;
                        return true;
                    }
                });

                column.elList.style.top = (column.elScroll.clientHeight - column.elItems[0].clientHeight) / 2 + 'px';
                that.toItem(columnIndex, itemActiveIndex);
            });
            this.elPicker.classList.remove('active');
        },

        touchStart: function (e) {
            var activeColumn = this.columns[e.currentTarget.dataset.columnIndex];

            activeColumn.startY = e.touches[0].clientY;
            activeColumn.touchActive = true;
            activeColumn.inertiaActive = false;

            this.activeColumn = activeColumn;

            e.preventDefault();
        },

        touchMove: function (e) {
            var activeColumn = this.columns[e.currentTarget.dataset.columnIndex];
            var disY = 0;
            var clientY = e.touches[0].clientY;
            var disYMin = 0;

            if (!activeColumn || !activeColumn.touchActive) {
                return true;
            }

            disYMin = -activeColumn.elItems[0].clientHeight * (activeColumn.elItems.length - 1);

            disY = clientY - activeColumn.startY + activeColumn.translateY;

            // 超过上下边界
            if (disY > 0) {
                disY = this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(disY);
            } else if (disY < disYMin) {
                disY = -(this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(-disY + disYMin)) + disYMin;
            }

            activeColumn.elList.style.transform = 'translate(0, ' + disY + 'px)';
            activeColumn.touchTranslateY = disY;
            activeColumn.lastTouchMovePoints.push({
                clientY: clientY,
                timeStamp: e.timeStamp
            });
            activeColumn.lastTouchMovePoints = activeColumn.lastTouchMovePoints.slice(-5);
        },

        touchEnd: function (e) {
            var activeColumn = this.activeColumn;
            var speed = 0;
            var touchMovePointLast = null;

            if (activeColumn && !activeColumn.touchActive) {
                return true;
            }

            if (activeColumn.lastTouchMovePoints.length >= 2) {
                touchMovePointLast = activeColumn.lastTouchMovePoints[activeColumn.lastTouchMovePoints.length - 1];
                speed = (touchMovePointLast.clientY - activeColumn.lastTouchMovePoints[0].clientY) / (touchMovePointLast.timeStamp - activeColumn.lastTouchMovePoints[0].timeStamp);
            } else {
                speed = 0;
            }

            this.inertia(speed);

            activeColumn.touchActive = false;
            activeColumn.startY = 0;
            activeColumn.lastTouchMovePoints = [];
        },

        /**
         * 惯性减速
         * @param {Number} speed 初始速度
         */
        inertia: function (speed) {
            var that = this;
            var activeColumn = this.activeColumn;
            var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
            // 最小速度
            var speedMin = 0.2;
            // 最大速度
            var speedMax = 3;
            // 速度放大系数
            var speedFactor = 15;
            var duration = 1000 / 60;
            // 加速度
            var acceleration = 0.3;
            // 当前移动距离
            var distance = 0;
            // 定时器方法
            var interval = null;
            // 移动的总距离(排除选项和上下边界的限制时)
            var willDistance = 0;
            // 总帧数
            var frameCount = 0;
            // 选项高度
            var itemHeight = activeColumn.elItems[0].clientHeight;
            // 下边界位移
            var disYMin = -itemHeight * (activeColumn.elItems.length - 1);
            // 实际移动总距离
            var realDistance = 0;
            // 每一帧执行
            var processFn = function () {
                var translateY = 0;

                translateY = activeColumn.touchTranslateY + distance;
                activeColumn.elList.style.transform = 'translate(0, ' + translateY + 'px)';
                activeColumn.translateY = translateY;
            };

            // 保证速度不为0
            speed = speed || 1e-5;

            // 加速度方向
            acceleration *= -Math.sign(speed);

            if (!requestAnimationFrame) {
                requestAnimationFrame = function (callback) {
                    window.setTimeout(callback, duration);
                };
            }

            // 限制最大速度
            speed = Math.abs(speed) > speedMax ? Math.sign(speed) * speedMax : speed;

            speed *= speedFactor;

            frameCount = Math.ceil(Math.abs(speed / acceleration));

            willDistance = frameCount * (speed + (frameCount - 1) * acceleration / 2);

            realDistance = Math.round((willDistance + activeColumn.touchTranslateY) / itemHeight) * itemHeight - activeColumn.touchTranslateY;

            // 超过上下边界
            if (willDistance + activeColumn.touchTranslateY > 0) {
                realDistance = -activeColumn.touchTranslateY;
            } else if (willDistance + activeColumn.touchTranslateY < disYMin) {
                realDistance = disYMin - activeColumn.touchTranslateY;
            }

            if (Math.sign(realDistance) * Math.sign(willDistance) === -1) {
                speed = -speed;
            }

            // 限制最小速度
            speed = Math.abs(speed) < (speedMin * speedFactor) ? Math.sign(speed) * (speedMin * speedFactor) : speed;

            // 重新计算加速度
            acceleration = Math.pow(speed, 2) / (speed - 2 * realDistance);

            interval = function (callback) {
                if (activeColumn.inertiaActive && Math.sign(acceleration) * Math.sign(speed) === -1) {
                    // 减速中
                    requestAnimationFrame(function () {
                        callback();
                        interval(callback);
                    });
                } else {
                    // 减速结束
                    processFn();
                    // activeColumn.touchTranslateY += distance;
                    activeColumn.inertiaActive = false;

                    activeColumn.activeIndex = Math.round(Math.abs(activeColumn.translateY) / itemHeight);
                    that.event.trigger('change', that.columns.indexOf(activeColumn));
                }
            };

            activeColumn.inertiaActive = true;

            interval(function () {
                distance += speed;
                processFn();
                speed += acceleration;
            });
        },

        /**
         * 移动到某一项
         * @param {Number} columnIndex
         * @param {Number} itemIndex
         */
        toItem: function (columnIndex, itemIndex) {
            var activeColumn = this.columns[columnIndex];
            var translateY = -activeColumn.elItems[0].clientHeight * (itemIndex);

            activeColumn.elList.style.transform = 'translate(0, ' + translateY + 'px)';
            activeColumn.translateY = translateY;

            activeColumn.activeIndex = itemIndex;
        },

        updateItems: function (columnIndex) {
            var column = this.columns[columnIndex];
            var itemsHtml = column.config.options.map(function (item) {
                return '<div class="picker-item">' + (typeof item.value === 'undefined' ? '' : item.value) + '</div>';
            }).join('');

            column.elList.innerHTML = itemsHtml;

            column.elItems = [].slice.call(column.elList.querySelectorAll('.picker-item'));

            if (column.activeIndex >= column.elItems.length) {
                this.toItem(columnIndex, column.elItems.length - 1);
            }
        },

        date: function () {
            var that = this;
            var dateNow = new Date();
            var configSelected = [];
            var columns = [];
            var createList = function (start, length) {
                return Array.apply(null, { length: length }).map(function (item, index) {
                    var value = index + start;

                    return {
                        key: value,
                        value: value.toString().replace(/^\d$/, '0$&')
                    }
                })
            };
            var generateDate = function (year, month) {
                var dateLength = 30;

                if (month === 2) {
                    if (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0) {
                        dateLength = 29;
                    } else {
                        dateLength = 28;
                    }
                } else if ([1, 3, 5, 7, 8, 10, 12].indexOf(month) > -1) {
                    dateLength = 31;
                } else {
                    dateLength = 30;
                }

                return createList(1, dateLength);
            };

            if (that.config.selected) {
                configSelected = that.config.selected.split(/-| |:/).map(function (item) {
                    return Number(item);
                });
            } else {
                // 默认取当前日期
                configSelected = [dateNow.getFullYear(), dateNow.getMonth() + 1, dateNow.getDate()];
            }

            columns = [
                {
                    name: 'year',
                    label: '年',
                    selected: configSelected[0],
                    options: createList(1900, 200),
                },
                {
                    name: 'month',
                    label: '月',
                    selected: configSelected[1],
                    options: createList(1, 12)
                },
                {
                    name: 'date',
                    label: '日',
                    selected: configSelected[2],
                    options: generateDate(configSelected[0], configSelected[1])
                }
            ];

            if (that.config.type === 'datetime') {
                columns.push({
                    name: 'hour',
                    label: '时',
                    selected: configSelected[3],
                    options: createList(0, 24)
                }, {
                    name: 'minute',
                    label: '分',
                    selected: configSelected[4],
                    options: createList(0, 60)
                }, {
                    name: 'second',
                    label: '秒',
                    selected: configSelected[5],
                    options: createList(0, 60)
                });
            };

            this.config.columns = columns;

            this.event.on('change', function (columnIndex) {
                var activeColumn = that.columns[columnIndex];
                var columnYear;
                var columnMonth;
                var columnDate;
                var selectedYear;
                var selectedMonth;

                that.columns.forEach(function (column) {
                    switch (column.config.name) {
                        case 'year':
                            columnYear = column;
                            break;
                        case 'month':
                            columnMonth = column;
                            break;
                        case 'date':
                            columnDate = column;
                            break;
                        default:
                            break;
                    }
                });

                if (activeColumn.config.name === 'year' || activeColumn.config.name === 'month') {
                    selectedYear = columnYear.config.options[columnYear.activeIndex].key;
                    selectedMonth = columnMonth.config.options[columnMonth.activeIndex].key;

                    columnDate.config.options = generateDate(selectedYear, selectedMonth);

                    that.updateItems(that.columns.indexOf(columnDate));
                }
            });
        }
    };

    window.Picker = Picker;
})();