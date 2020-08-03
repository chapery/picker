var Picker = function (target, config) {
    this.elTarget = typeof target === 'string' ? document.querySelector(target) : target;
    this.config = config;
    this.elPicker = document.querySelector('.picker-mask');
    this.elColumnsWrap = this.elPicker.querySelector('.picker-columns');

    // 允许超出滚动边界的最大距离
    this.flexableDistance = 100;

    // 存放每列相关属性
    this.columns = this.config.columns.map(function () {

        return {
            elColumn: null,
            elScroll: null,
            elList: null,
            elItems: null,
            // 是否处于触控状态
            touchActive: false,
            startY: 0,
            translateY: 0,
            /**
             * 是否正在进行惯性滚动
             */
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
    });

    // touch状态下的column
    this.activeColumn = null;

    // picker是否处于显示状态
    this.active = false;

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
            this.layout();
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
                return '<div class="picker-item">' + item.value + '</div>';
            }).join('');
            var columnHtml = '<div class="picker-scroll" data-column-index="' + columnIndex + '">\
                                <div class="picker-list">'
                + itemsHtml +
                '</div>\
                            </div>\
                            <div class="picker-label">'
                + column.label +
                '</div>';

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
        
        this.elTarget.addEventListener('click', this.toggle.bind(this), false);
        this.elPicker.addEventListener('click', function (e) {
            if (e.currentTarget === e.target) {
                that.toggle();
            }
        }, false);

        this.elPicker.querySelector('.picker-cancel').addEventListener('click', this.toggle.bind(this), false);

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

            that.toggle();
        }, false);
        
        this.columns.forEach(function (column) {
            column.elScroll.addEventListener('touchstart', that.touchStart.bind(that), false);
            column.elScroll.addEventListener('touchend', that.touchEnd.bind(that), false);
        });

        document.addEventListener('touchmove', that.touchMove.bind(that), false);
    },

    layout: function () {
        this.columns.forEach(function (column) {
            column.elList.style.top = (column.elScroll.clientHeight - column.elItems[0].clientHeight) / 2 + 'px';
        });
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
        var activeColumn = this.activeColumn;
        var disY = 0;
        var clientY = e.touches[0].clientY;
        var disYMin = -activeColumn.elItems[0].clientHeight * (activeColumn.elItems.length - 1);

        if (!activeColumn.touchActive) {
            return true;
        }

        disY = clientY - activeColumn.startY + (Number(activeColumn.elList.dataset.translateY) || 0);

        // 超过上下边界
        if (disY > 0) {
            disY = this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(disY);
        } else if (disY < disYMin) {
            disY = -(this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(-disY + disYMin)) + disYMin;
        }

        activeColumn.elList.style.transform = 'translate(0, ' + disY + 'px)';
        activeColumn.translateY = disY;
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

        if (!activeColumn.touchActive) {
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
        var speedMin = 0.3;
        // 最大速度
        var speedMax = 2;
        // 速度放大系数
        var speedFactor = 10;
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

            translateY = activeColumn.translateY + distance;
            activeColumn.elList.style.transform = 'translate(0, ' + translateY + 'px)';
            activeColumn.elList.dataset.translateY = translateY;
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

        realDistance = Math.round((willDistance + activeColumn.translateY) / itemHeight) * itemHeight - activeColumn.translateY;

        // 超过上下边界
        if (willDistance + activeColumn.translateY > 0) {
            realDistance = -activeColumn.translateY;
        } else if (willDistance + activeColumn.translateY < disYMin) {
            realDistance = disYMin - activeColumn.translateY;
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
                activeColumn.translateY += distance;
                activeColumn.inertiaActive = false;

                activeColumn.activeIndex = Math.round(Math.abs(activeColumn.translateY) / itemHeight);
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
        var translateY = -activeColumn.elItems[0].clientHeight * (itemIndex - 1);

        activeColumn.translateY = translateY;
        activeColumn.elList.style.transform = 'translate(0, ' + translateY + 'px)';
    }
};

var Datetime = function () {

}

new Picker('input[data-picker]', {
    columns: [
        {
            label: ':',
            selected: 2,
            options: [
                {
                    key: 1,
                    value: '选项1'
                },
                {
                    key: 2,
                    value: '选项2'
                },
                {
                    key: 3,
                    value: '选项3'
                },
                {
                    key: 4,
                    value: '选项4'
                },
                {
                    key: 5,
                    value: '选项5'
                },
                {
                    key: 6,
                    value: '选项6'
                },
                {
                    key: 7,
                    value: '选项7'
                },
                {
                    key: 8,
                    value: '选项8'
                },
                {
                    key: 9,
                    value: '选项9'
                },
                {
                    key: 10,
                    value: '选项10'
                },
            ]
        },
        {
            label: ':',
            options: [
                {
                    key: 11,
                    value: '选项11'
                },
                {
                    key: 22,
                    value: '选项22'
                },
                {
                    key: 33,
                    value: '选项33'
                },
                {
                    key: 44,
                    value: '选项44'
                },
                {
                    key: 55,
                    value: '选项55'
                },
                {
                    key: 66,
                    value: '选项66'
                },
                {
                    key: 77,
                    value: '选项77'
                },
            ]
        }
    ]
});