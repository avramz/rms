/**
 * jQuery plugin for multi range sliders.
 * @author: Avramz
 * @param options
 * @returns {$.fn}
 */
;(function ($) {
    'use strict';

    /**
     * Light jQuery plugin wrapper.
     * @param options
     * @returns {Array} $.fn.MultiRangeSlider
     * @constructor
     */
    $.fn.MultiRangeSlider = function (options) {
        var _inst = [];

        this.each(function () {
            if (!$.data(this, 'rms_x')) {
                _inst.push($.data(this, 'rms_x', new Plugin(this, options)));
            }
        });

        return _inst.length > 1 ? _inst : _inst[0];
    };

    /**
     * Plugin core logic.
     * @param element
     * @param options
     * @constructor
     */
    function Plugin(element, options) {
        var me = this,
            opts = $.extend({}, $.fn.MultiRangeSlider.defaults, options),
            sliders = {};

        this.maxValue = _getSlidesMaxValue(element);
        this.initialMax = this.maxValue;

        $(element).find(opts.rangeSelector).each(function (i) {
            var sliderName = $(this).attr('data-rms-name') || 'slide-' + i;

            sliders[sliderName] = new Slider(this, {
                id: sliderName,
                value: parseFloat($(this).attr('data-rms-value')),
                step: parseFloat($(this).attr('data-rms-step')),
                minValue: parseFloat($(this).attr('data-rms-min')) || 0,
                maxValue: parseFloat($(this).attr('data-rms-max')),
                totalValue: me.maxValue,
                disabledClass: opts.disabledClass,
                fillClass: opts.fillClass,
                rangeClass: opts.rangeClass,
                handleClass: opts.handleClass,
                lockClass: opts.lockClass,
                useLock: opts.useLock,
                onDrag: _updateSlides,
                onDragEnd: opts.onDragEnd,
                onLock: _updateMaxValues,
                sliders: sliders
            });
        });

        //expose sliders for manipulation
        this.sliders = sliders;
        this.onDrag = opts.onDrag;
        this.onInit = opts.onInit;

        this.onInit(sliders);

        /**
         * Handle slide movement logic.
         * @param _slider
         * @private
         */
        function _updateSlides(_slider) {
            _slider.$label.text(Math.round(_slider.value));
            me.normalizeSlides(_slider);

            if (me.onDrag && typeof me.onDrag === 'function') {
                me.onDrag(_slider, sliders);
            }
        }

        /**
         * Return slide value without minimum.
         * @param element
         * @returns {number}
         * @private
         */
        function _getSlidesMaxValue(element) {
            var maxValue = 0;

            $(element).find(opts.rangeSelector).each(function () {
                var min = $(this).attr('data-rms-min') || 0;


                if (!$(this).attr('data-rms-max')) {
                    _error('Plugin Error', 'Max value missing for slider element' + this);
                }

                if (parseInt($(this).attr('data-rms-max')) - min > maxValue) {
                    maxValue = parseInt($(this).attr('data-rms-max')) - min;
                }
            });

            return maxValue;
        }

        /**
         * Updates maxValues for each slide when a slide is locked.
         * @private
         */
        function _updateMaxValues() {
            var totalLockSlidesAmount = 0;

            $.each(me.sliders, function (i, __slider) {
                if (__slider.isLocked) {
                    totalLockSlidesAmount += Math.abs(__slider.getValue() - __slider.minValue);
                }
            });

            me.maxValue = me.initialMax - totalLockSlidesAmount;

            $.each(me.sliders, function (i, __slider) {
                if (!__slider.isLocked) {
                    __slider.totalValue = __slider.minValue + me.maxValue;
                }
            });
        }
    }

    /**
     * Return total sliders sum.
     * @param excludeLockedSlides
     * @returns {number}
     */
    Plugin.prototype.getSlideSum = function (excludeLockedSlides) {
        var sum = 0,
            unlockedSlideSum = 0;

        $.each(this.sliders, function (i, __slider) {
            if (!__slider.isLocked) {
                unlockedSlideSum += Math.round(__slider.getValue() - __slider.minValue);
            }
            sum += Math.round(__slider.getValue() - __slider.minValue);

        });

        return excludeLockedSlides ? unlockedSlideSum : sum;
    };

    /**
     * Resets the slides.
     * @public
     */
    Plugin.prototype.reset = function () {
        $.each(this.sliders, function (i, __slider) {
            __slider.reset();
        });
    };

    /**
     * Update other slides when other slide is being moved.
     * @param _slider
     * @public
     */
    Plugin.prototype.normalizeSlides = function (_slider) {
        var slidersToDistribute = [];

        $.each(this.sliders, function (i, __slider) {
            if (!__slider.isDisabled && __slider.getValue() > __slider.minValue && __slider.id !== _slider.id && !__slider.isLocked) {
                slidersToDistribute.push(__slider);
            }
        });

        if (this.getSlideSum(true) > this.maxValue) {
            this.updateSlides(Math.abs(this.getSlideSum(true) - this.maxValue), slidersToDistribute);
        }
    };

    /**
     * Update other slides when other slide is being moved.
     * @param amountToDistribute
     * @param slides
     * @public
     */
    Plugin.prototype.updateSlides = function (amountToDistribute, slides) {
        var slideNum = slides.length,
            amount = amountToDistribute,
            amountPerSlider = Math.floor(amount / slideNum),
            leftover = amount % slideNum,
            amountLeftover = 0,
            slideLeftover = [];

        for (var i = 0, max = slideNum; i < max; i++) {
            var extra = i < leftover ? 1 : 0,
                newSliderValue = slides[i].getValue() - (amountPerSlider + extra);

            if (newSliderValue < slides[i].minValue) {
                slides[i].setValue(slides[i].minValue, false);
                amountLeftover += Math.abs(newSliderValue - slides[i].minValue);
            }
            else {
                slides[i].setValue(newSliderValue, false);
                slideLeftover.push(slides[i]);
            }
        }

        if (amountLeftover > 0) {
            this.updateSlides(amountLeftover, slideLeftover);
        }
    };

    /**
     * Slider core logic.
     * @param element
     * @param config
     * @constructor
     */
    function Slider(element, config) {
        var me = this;

        this.id = config.id;

        //Dom
        this.document = document.documentElement;
        this.$element = $(element);
        this.$range = $('<div/>', {class: 'rms-slide-track'});
        this.$fill = $('<span/>', {class: 'rms-slide-fill'});
        this.$handle = $('<span/>', {class: 'rms-slide-handle ' + config.handleClass});
        this.$label = $(element).find('[data-rms-label]');

        //insert into DOM
        this.$range.append(this.$fill, this.$handle);
        this.$element.addClass('rms-slide').append(this.$range);

        this.isDown = false; //is mouse down in progress
        this.isDisabled = false; //is mouse down in progress
        this.isLocked = false; //is slider locked

        // expose properties
        this.onDrag = config.onDrag;
        this.onDragEnd = config.onDragEnd;
        this.onLock = config.onLock;
        this.step = config.step ? config.step : 1;
        this.minValue = config.minValue;
        this.maxValue = config.maxValue;
        this.value = config.value ? config.value : this.minValue;
        this.totalValue = config.totalValue + this.maxValue;
        this.cachePosition = null;

        // attach mouse down listeners
        this.attachEventListeners(this.$range[0], 'mousedown', _downHandler);
        this.attachEventListeners(this.$range[0], 'touchstart', _downHandler);
        this.attachEventListeners(this.$range[0], 'pointerdown', _downHandler);

        this.attachEventListeners(window, 'resize', _resizeHandler);

        if (config.useLock) {
            this.$lock = $('<span/>', {class: 'rms-slide-lock ' + config.lockClass});
            this.$element.append(this.$lock);
            _lockHandler(this.$lock);
        }

        /**
         * Handle movement.
         * @param e
         * @private
         */
        function _moveHandler(e) {
            e = e || window.event;

            var pos = e.pageX || e.touches[0].clientX,
                dragValue,
                max = me.maxValue > me.totalValue ? me.totalValue : me.maxValue;

            if (!pos) {
                pos = !e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            }

            dragValue = Math.round(((pos - me.$range.offset().left) * me.maxValue / me.$range.outerWidth()));

            if (me.isDown) {
                if (dragValue > max) {
                    me.setValue(max);
                    return;
                }
                else if (dragValue < me.minValue) {
                    me.setValue(me.minValue);
                    return;
                }

                me.$handle.css('left', Math.round((pos - me.$range.offset().left - (me.$handle.outerWidth() / 2))) + 'px');
                me.$fill.css('width', (pos - me.$range.offset().left) + 'px');
                me.cachePosition = dragValue;
                me.value = dragValue;
                me.onDrag(me);
            }
        }

        /**
         * Handle mouse down. Add move/up listeners only when this handler is active, increasing performance by removing them on @upHandler.
         * @param e
         * @returns {boolean}
         * @private
         */
        function _downHandler(e) {
            e.preventDefault();
            // attach move listeners while move is active
            me.attachEventListeners(document, 'mousemove', _moveHandler);
            me.attachEventListeners(document, 'touchmove', _moveHandler);
            me.attachEventListeners(document, 'pointermove', _moveHandler);

            me.attachEventListeners(document, 'mouseup', _upHandler);
            me.attachEventListeners(document, 'touchend', _upHandler);
            me.attachEventListeners(document, 'pointerup', _upHandler);


            $(me.document).addClass('rms-select-disable');
            me.isDown = true;
            _moveHandler(e);
            return false;
        }

        /**
         * Handle mouse up.
         * @param e
         * @private
         */
        function _upHandler(e) {
            e.preventDefault();
            $(me.document).removeClass('rms-select-disable');

            //remove move listeners
            me.removeEventListeners(document, 'mousemove', _moveHandler);
            me.removeEventListeners(document, 'touchmove', _moveHandler);
            me.removeEventListeners(document, 'pointermove', _moveHandler);

            me.removeEventListeners(document, 'mouseup', _upHandler);
            me.removeEventListeners(document, 'touchend', _upHandler);
            me.removeEventListeners(document, 'pointerup', _upHandler);
            me.isDown = false;
            me.onDragEnd(me);
        }

        /**
         * Handle window resize.
         * @param e
         * @private
         */
        function _resizeHandler(e) {
            e.preventDefault();
            me.initHandle();
        }

        /**
         * Handles slide lock.
         * @param $element
         * @private
         */
        function _lockHandler($element) {
            $element.on('click', function (e) {
                e.preventDefault();
                me.$element.toggleClass('disabled');
                me.isLocked = !me.isLocked;
                me.onLock();
            });
        }

        //initialize the slider.
        this.initHandle();
    }

    /**
     * Initialize the slider.
     * @public
     */
    Slider.prototype.initHandle = function () {
        this.cachePosition = Math.round((this.value * this.$range.outerWidth()) / this.maxValue);
        this.$handle.css('left', Math.round((this.cachePosition - (this.$handle.outerWidth() / 2))) + 'px');
        this.$fill.css('width', this.cachePosition + 'px');
        this.onDrag(this);
    };

    /**
     * Reset the slider.
     * @public
     */
    Slider.prototype.reset = function () {
        this.value = this.minValue;
        this.$element.removeClass('disabled');
        this.isLocked = false;
        this.cachePosition = Math.round((this.value * this.$range.outerWidth()) / this.maxValue);
        this.$handle.css('left', Math.round((this.cachePosition - (this.$handle.outerWidth() / 2))) + 'px');
        this.$fill.css('width', this.cachePosition + 'px');
        this.onDrag(this);
    };

    /**
     * Set value for the given slider.
     * @param val
     * @param updateSlides
     * @public
     */
    Slider.prototype.setValue = function (val, updateSlides) {
        var max = this.maxValue > this.totalValue ? this.totalValue : this.maxValue;
        this.value = val;

        if (val >= max) {
            this.value = max;
        }
        else if (val <= this.minValue) {
            this.value = this.minValue;
        }

        if (this.isLocked) {
            return console.log('Unable to change value, slide is locked.');
        }

        this.cachePosition = Math.round((this.value * this.$range.outerWidth()) / this.maxValue);
        this.$handle.css('left', Math.round((this.cachePosition - (this.$handle.outerWidth() / 2))) + 'px');
        this.$fill.css('width', this.cachePosition + 'px');
        this.$label.text(Math.round(this.value));

        if (arguments.length != 2) {
            this.onDrag(this);
        }
    };

    /**
     * Get slider value
     * @returns {*}
     * @public
     */
    Slider.prototype.getValue = function () {
        return this.value;
    };

    /**
     * Attach event listeners.
     * @param element
     * @param event
     * @param callback
     * @public
     */
    Slider.prototype.attachEventListeners = function (element, event, callback) {
        if (element.addEventListener) {
            element.addEventListener(event, callback, false);
        } else if (element.attachEvent) {
            element.attachEvent('on' + event, callback);
        }
    };

    /**
     * Remove event listeners.
     * @param element
     * @param event
     * @param callback
     * @public
     */
    Slider.prototype.removeEventListeners = function (element, event, callback) {
        if (element.removeEventListener) {
            element.removeEventListener(event, callback);
        } else if (element.detachEvent) {
            element.detachEvent('on' + event, callback);
        }
    };

    /**
     * Custom error handler
     * @param errorName
     * @param errorMsg
     * @private
     */
    function _error(errorName, errorMsg) {
        var err = new Error(errorMsg);
        err.name = errorName;

        throw err;
    }

    /**
     * Plugin defaults.
     * @type {{rangeSelector: string, disabledClass: string, fillClass: string, rangeClass: string, handleClass: string, lockClass: string, useLock: boolean, onInit: onInit, onDrag: onDrag}}
     */


    $.fn.MultiRangeSlider.defaults = {
        rangeSelector: '.slide',
        disabledClass: 'disabled',
        fillClass: 'rms-slide-fill',
        rangeClass: 'rms-slide',
        handleClass: '',
        lockClass: '',
        useLock: true,
        onInit: function () {
        },
        onDrag: function () {
        },
        onDragEnd: function () {
        }
    };

}(jQuery));