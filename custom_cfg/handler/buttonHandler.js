// Copyright (c) 2015 Yahoo inc. (http://www.yahoo-inc.com)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

"use strict";
//Conforms to the ConditionHandler protocol in UIAutoMonkey
//Usage 
//  var handlers = [ ];
//  var handlerInterval = 20;  //every how many events to process. Can vary by each handler, but often useful to group them
//  handlers.push(new ButtonHandler("Done", handlerInterval, false));  //every 20 events, press "Done" button if found as a top level button (no nav bar). 
//  ...
//  config.conditionHandlers = handlers
//	buttonName：按钮的名称；
//	checkEveryNumber：点击的权重；
//  useNavBar：是否是在导航栏上的按钮，是传true；不是导航栏上按钮传false；
//  optionalEventType：0<->back（导航栏上的按钮）;  1<->我的（底部tab上的按钮）；
//  调用的逻辑是先判断handlers里面的元素数量，有的话才会处理ButtonHandler。会先判断istrue是否为真，为真的话才会执行handler,
//  所以istrue和handle是自定义必须处理的两个地方

var target = UIATarget.localTarget();

function ButtonHandler(buttonName, checkEveryNumber, useNavBar, optionalEventType, optionalIsTrueFunction) {
	this.buttonName = buttonName;
	this.checkEveryNumber = checkEveryNumber || 10;
	if (useNavBar == undefined) {
		useNavBar = true;
	};
	this.useNavBar = useNavBar;
	this.optionalEventType = optionalEventType || 0;
	this.optionalIsTrueFunction = optionalIsTrueFunction || null;
	//stats
	this.statsIsTrueInvokedCount = 0;
	this.statsIsTrueReturnedTrue = 0;
	this.statsIsTrueReturnedFalse = 0;
	this.statsHandleInvokedCount = 0;
	this.statsHandleNotValidAndVisibleCount = 0;
	this.statsHandleErrorCount = 0;

	this.statsBackToMainPage = 0;
}

// return true if we our button is visible 
ButtonHandler.prototype.isTrue = function(target, eventCount, mainWindow) {
	this.statsIsTrueInvokedCount++;
	var result;
	if (this.statsBackToMainPage){
		result = 1;
	}else if (this.optionalIsTrueFunction == null) {
		var aButton = this.findButton(target);
		// result = aButton.isNotNil() && aButton.validAndVisible();
		result = aButton.isNotNil() && aButton.isValid() && aButton.isVisible();
	} else {
		result = this.optionalIsTrueFunction(target, eventCount, mainWindow);
	}
	if (result) {
		this.statsIsTrueReturnedTrue++;
	} else {
		this.statsIsTrueReturnedFalse++;
	}
	return result;
};

ButtonHandler.prototype.findButton = function(target) {
	switch(this.optionalEventType){
		case 0:
			return this.useNavBar ?
				target.frontMostApp().mainWindow().navigationBar().buttons()[this.buttonName] :
				target.frontMostApp().mainWindow().buttons()[this.buttonName];
			break;
		case 1:
			return target.frontMostApp().tabBar().buttons()[this.buttonName];
			break;
	}
};

//every checkEvery() number of events our isTrue() method will be queried.
ButtonHandler.prototype.checkEvery = function() {
	return this.checkEveryNumber;
};

// if true then after we handle an event consider the particular Monkey event handled, and don't process the other condition handlers.
ButtonHandler.prototype.isExclusive = function() {
	return true;
};

//返回到工作台首页，避免进入某个页面死循环
ButtonHandler.prototype.backToMainPage = function() {
	UIALogger.logMessage("*** begin to back to main page ***");
	var backBtn = target.frontMostApp().mainWindow().navigationBar().buttons()["nav back"];
	var closeBtn = target.frontMostApp().mainWindow().buttons()["关闭"];
	if(closeBtn.isVisible() && closeBtn.isValid()){
		try{
			closeBtn.tap();
		}catch(err){
			UIALogger.logWarning(err);
		}

	}
	while(backBtn.isVisible() && backBtn.isValid()){
		try{
			backBtn.tap();
			target.delay(2);
			backBtn = target.frontMostApp().mainWindow().navigationBar().buttons()["nav back"];
		}catch(err){
			UIALogger.logWarning(err);
		}
	}

	UIALogger.logMessage("*** success end to back to main page ***");
};

// Press our button
ButtonHandler.prototype.handle = function(target, mainWindow) {
	this.statsHandleInvokedCount++;

	if(this.statsBackToMainPage == 1){
		this.backToMainPage();
		return;
	}
	var button = this.findButton(target);
	if (button.isValid() && button.isVisible()) {
		try{
			button.tap();
		} catch(err) {
			this.statsHandleErrorCount++;
			UIALogger.logWarning(err);
		}
	}else {
		this.statsHandleNotValidAndVisibleCount++;
		//UIALogger.logWarning(this.toString() + " button is not validAndVisible");
	};
};

ButtonHandler.prototype.toString = function() {
	return ["MonkeyTest::ButtonHandler(" + this.buttonName, this.checkEveryNumber, this.useNavBar, ")"].join();
};

ButtonHandler.prototype.logStats = function() {
	UIALogger.logDebug([this.toString(),
		"IsTrueInvokedCount", this.statsIsTrueInvokedCount,
		"IsTrueReturnedTrue", this.statsIsTrueReturnedTrue,
		"IsTrueReturnedFalse", this.statsIsTrueReturnedFalse,
		"HandleInvokedCount", this.statsHandleInvokedCount,
		"HandleNotValidAndVisibleCount", this.statsHandleNotValidAndVisibleCount,
		"HandleErrorCount", this.statsHandleErrorCount].join());
};