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
    },

    touchMove: function (e) {
        var disY = 0;
        var clientY = e.touches[0].clientY;

        if (!this.touch.elScroll) {
            return true;
        }

        disY = clientY - this.touch.startY + (Number(this.touch.elList.dataset.translateY) || 0);
        this.touch.elList.style.transition = 'none';
        this.touch.elList.style.transform = 'translate(0, ' + disY + 'px)';
        this.touch.translateY = disY;        
        this.touch.lastTouchMovePoints.push({
            clientY: clientY,
            timeStamp: e.timeStamp
        });
        this.touch.lastTouchMovePoints.slice(-5);
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

        // if (that.touch.translateY > 0) {
        //     translateY = 0;
        //     that.touch.elList.style.transition = 'transform 500ms ease-out';
        // } else if (that.touch.translateY < -that.touch.elList.scrollHeight + elItemHeight) {
        //     translateY = -that.touch.elList.scrollHeight + elItemHeight;
        //     that.touch.elList.style.transition = 'transform 500ms ease-out';
        // } else {
        //     translateY = that.touch.translateY;

        // }
        
        // that.touch.elList.style.transform = 'translate(0, ' + translateY + 'px)';
        // that.touch.elList.dataset.translateY = translateY;

        touchMovePointLast = that.touch.lastTouchMovePoints[that.touch.lastTouchMovePoints.length - 1];
        speed = (touchMovePointLast.clientY - that.touch.lastTouchMovePoints[0].clientY) / (touchMovePointLast.timeStamp - that.touch.lastTouchMovePoints[0].timeStamp);
        
        that.inertia(speed, function (distance) {
            var translateY = 0;

            translateY = that.touch.translateY + distance;
            that.touch.elList.style.transform = 'translate(0, ' + translateY + 'px)';
            that.touch.elList.dataset.translateY = translateY;
        }, function () {
            that.touch.translateY = 0;
        });

        that.touch.elScroll = null;
        that.touch.startY = 0;
        that.touch.lastTouchMovePoints = [];
    },

    /**
     * 惯性减速
     * @param {Number} speed 初始速度
     * @param {Function} processCallback 运动中回调
     * @param {Function} finishCallback 运动结束回调
     */
    inertia: function (speed, processCallback, finishCallback) {
        console.log(speed)
        var that = this;
        var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
        var duration = 1000 / 60;
        // 加速度
        var acceleration = (speed > 0 ? -1 : 1) * 0.03;
        // 累计移动距离
        var distance = 0;

        var interval = null;

        if (!requestAnimationFrame) {
            requestAnimationFrame = function( callback ){
                window.setTimeout(callback, duration);
            };
        }

        speed = Math.abs(speed) > 0.8 ? (speed > 0 ? 1 : -1) * 0.8 : speed;

        interval = function (callback) {
            if (that.touch.inertiaActive && (acceleration < 0 && speed > 0 || acceleration > 0 && speed < 0)) {
                requestAnimationFrame(function () {
                    callback();
                    interval(callback);
                });
            } else {                
                finishCallback && finishCallback(distance);
                that.touch.inertiaActive = false;
            }
        };
                    
        that.touch.inertiaActive = true;

        interval(function () {
            speed = speed + acceleration;
            distance += speed * duration;
            processCallback && processCallback(distance);
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
                }
            ]
        }
    ]
});