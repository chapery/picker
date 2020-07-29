var Picker = function (target, config) {
    this.elTarget = typeof target === 'string' ? document.querySelector(target) : target;
    this.config = config;
    this.elPicker = document.querySelector('.picker-container');
    this.elColumns = this.elPicker.querySelector('.picker-columns');
    this.touch = {
        elScroll: null,
        elList: null,
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
        lastTouchMovePoints: []
    },
    // 允许超出滚动边界的最大距离
    this.flexableDistance = 80;
    
    this.createColumns();
    this.bindEvent();
}

Picker.prototype = {

    consturctor: Picker,

    /**
     * 生成列
     */
    createColumns: function () {
        var that = this;

        that.config.columns.forEach(function (column) {
            var elColumn = document.createElement('div');
            var optionsHtml = column.options.map(function (item) {
                return '<div class="picker-item">' + item.name + '</div>';
            }).join('');
            var columnHtml = '<div class="picker-scroll">\
                                <div class="picker-list">'
                                + optionsHtml +
                                '</div>\
                            </div>\
                            <div class="picker-label">'
                            + column.label +
                            '</div>';

            elColumn.className = 'picker-column';
            elColumn.innerHTML = columnHtml;

            that.elColumns.appendChild(elColumn);

        });
    },

    bindEvent: function () {
        var that = this;

        [].forEach.call(that.elColumns.querySelectorAll('.picker-scroll'), function (elScroll) {
            elScroll.addEventListener('touchstart', that.touchStart.bind(that), false);
            elScroll.addEventListener('touchend', that.touchEnd.bind(that), false);
        });

        document.addEventListener('touchmove', that.touchMove.bind(that), false);
    },

    touchStart: function (e) {
        this.touch.startY = e.touches[0].clientY;
        this.touch.elScroll = e.currentTarget;
        this.touch.elList = e.currentTarget.querySelector('.picker-list');
        this.touch.inertiaActive = false;
        e.preventDefault();
    },

    touchMove: function (e) {
        var disY = 0;
        var clientY = e.touches[0].clientY;
        var elItems = this.touch.elList.querySelectorAll('.picker-item');
        var disYMin = -elItems[0].clientHeight * (elItems.length - 1);

        if (!this.touch.elScroll) {
            return true;
        }

        disY = clientY - this.touch.startY + (Number(this.touch.elList.dataset.translateY) || 0);

        // 超过上下边界
        if (disY > 0) {
            disY = this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(disY);
        } else if (disY < disYMin) {
            disY = -(this.flexableDistance / Math.sqrt(screen.height) * Math.sqrt(-disY + disYMin)) + disYMin;
        }

        this.touch.elList.style.transform = 'translate(0, ' + disY + 'px)';
        this.touch.translateY = disY;
        this.touch.lastTouchMovePoints.push({
            clientY: clientY,
            timeStamp: e.timeStamp
        });
        this.touch.lastTouchMovePoints = this.touch.lastTouchMovePoints.slice(-5);
    },

    touchEnd: function (e) {
        var that = this;
        var elItemHeight = 0;
        var speed = 0;
        var touchMovePointLast = null;

        if (!that.touch.elScroll) {
            return true;
        }

        elItemHeight = that.touch.elList.children[0].clientHeight;

        if (that.touch.lastTouchMovePoints.length >= 2) {
            touchMovePointLast = that.touch.lastTouchMovePoints[that.touch.lastTouchMovePoints.length - 1];
            speed = (touchMovePointLast.clientY - that.touch.lastTouchMovePoints[0].clientY) / (touchMovePointLast.timeStamp - that.touch.lastTouchMovePoints[0].timeStamp);
        } else {
            speed = 0;
        }

        that.inertia(speed);

        that.touch.elScroll = null;
        that.touch.startY = 0;
        that.touch.lastTouchMovePoints = [];
    },

    /**
     * 惯性减速
     * @param {Number} speed 初始速度
     */
    inertia: function (speed) {
        var that = this;
        var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
        // 最小速度
        var speedMin = 0.2;
        // 最大速度
        var speedMax = 1.5;
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
        var elItems = this.touch.elList.querySelectorAll('.picker-item');
        // 选项高度
        var optionHeight = elItems[0].clientHeight;
        // 下边界位移
        var disYMin = -optionHeight * (elItems.length - 1);
        // 实际移动总距离
        var realDistance = 0;
        // 每一帧执行
        var processFn = function () {
            var translateY = 0;

            translateY = that.touch.translateY + distance;
            that.touch.elList.style.transform = 'translate(0, ' + translateY + 'px)';
            that.touch.elList.dataset.translateY = translateY;
        };

        // 保证速度不为0
        speed = speed || 1e-5;

        // 加速度方向
        acceleration *= -Math.sign(speed);

        if (!requestAnimationFrame) {
            requestAnimationFrame = function( callback ){
                window.setTimeout(callback, duration);
            };
        }

        // 限制最大速度
        speed = Math.abs(speed) > speedMax ? Math.sign(speed) * speedMax : speed;

        speed *= speedFactor;

        frameCount = Math.ceil(Math.abs(speed / acceleration));
        
        willDistance = frameCount * (speed + (frameCount - 1) * acceleration / 2);

        realDistance = Math.round((willDistance + that.touch.translateY) / optionHeight) * optionHeight - that.touch.translateY;

        // 超过上下边界
        if (willDistance + that.touch.translateY > 0) {
            realDistance = -that.touch.translateY;
        } else if (willDistance + that.touch.translateY < disYMin) {
            realDistance = disYMin - that.touch.translateY;
        }

        if (Math.sign(realDistance) * Math.sign(willDistance) === -1) {
            speed = -speed;
        }
        
        // 限制最小速度
        speed = Math.abs(speed) < (speedMin * speedFactor) ? Math.sign(speed) * (speedMin * speedFactor) : speed;

        // 重新计算加速度
        acceleration = Math.pow(speed, 2) / (speed - 2 * realDistance);
        
        interval = function (callback) {
            if (that.touch.inertiaActive && Math.sign(acceleration) * Math.sign(speed) === -1) {
                // 减速中
                requestAnimationFrame(function () {
                    callback();
                    interval(callback);
                });
            } else {
                // 减速结束
                processFn();
                that.touch.translateY += distance;
                that.touch.inertiaActive = false;
            }
        };

        that.touch.inertiaActive = true;

        interval(function () {
            distance += speed;
            processFn();
            speed += acceleration;
        });
    },
};

new Picker('input[data-picker]', {
    columns: [
        {
            label: ':',
            options: [
                {
                    value: 1,
                    name: '选项1'
                },
                {
                    value: 2,
                    name: '选项2'
                },
                {
                    value: 3,
                    name: '选项3'
                },
                {
                    value: 4,
                    name: '选项4'
                },
                {
                    value: 5,
                    name: '选项5'
                },
                {
                    value: 6,
                    name: '选项6'
                },
                {
                    value: 7,
                    name: '选项7'
                },
            ]
        }
    ]
});