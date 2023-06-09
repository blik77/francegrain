Ext.tip.QuickTipManager.init();
var mainPanel;
var defaultDate=new Date();
var sprAr=[];
Ext.define("Ext.locale.ru.picker.Date",{
    format:"d.m.Y",
    startDay:1
});

Ext.onReady(function(){
    Ext.Ajax.on('beforerequest',function(){ Ext.getBody().mask(vcbl[lang].name_mask); }, Ext.getBody());
    Ext.Ajax.on('requestcomplete',function(){ Ext.getBody().unmask(); } ,Ext.getBody());
    Ext.Ajax.on('requestexception',function(){ Ext.getBody().unmask(); }, Ext.getBody());
    auth();
});
function auth(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'authSession' },
        success: function(response){
            var text=response.responseText*1;
            if(text===1){ viewPage(); }
            else { loginWin(); }
        },
        failure: function(response){ Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed); }
    });
}
function loginWin(){
    var enterBut=Ext.create('Ext.button.Button', {
        text: vcbl[lang].login_win_button,
        disabled: true,
        handler: function(){
            if(!win.validateField()) return false;
            Ext.Ajax.request({
                url: 'index.php',
                method: 'POST',
                params: { codex: 'auth', login: win.getComponent('login').getValue(), password: win.getComponent('password').getValue() },
                success: function(response){
                    var text=response.responseText*1;
                    if(text===1){ viewPage(); win.close(); }
                    else {
                        Ext.Msg.alert(vcbl[lang].title_alert_error, "Access denied!");
                        //window.location="http://www.kortes.com/404.html";
                    }
                },
                failure: function(response){ Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed); }
            });
        }
    });
    var win=Ext.create('Ext.window.Window',{
        title: vcbl[lang].login_win_title,
        iconCls: 'logout',
        width: 300,
        id: 'loginwin',
        closable: false, resizable: false, draggable: false,
        modal: true, border: false, plain: true,
        defaultFocus: 'login',
        keyEnter: {},
        layout: { type: 'vbox', align: 'stretch' },
        defaults: { xtype: 'textfield', allowBlank: false, blankText: vcbl[lang].blank_text, listeners: {
            change: function(tF,nV,oV){ if(win.validateField()) enterBut.enable(); else enterBut.disable(); }
        } },
        items: [
            { id: 'login', fieldLabel: 'Login' },
            { id: 'password', fieldLabel: 'Password', inputType: 'password' }
        ],
        buttons: [enterBut],
        validateField: function(){
            if(!this.getComponent('login').isValid() || !this.getComponent('password').isValid()) return false;
            else return true;
        },
        listeners: {
            show: function(w){
                w.keyEnter=new Ext.util.KeyMap({
                    target: w.getId(),
                    key: 13,
                    fn: enterBut.handler
                });
            },
            close: function(w){w.keyEnter.destroy();}
        }
    });
    win.show();
}

function viewPage(){
    getSpr();
    let brokers = brokersPanel();
    let gridCost=gridPanelCost();
    let gridMonth=gridPanelMonth();
    let comment = commentPanel();
    mainPanel=Ext.create('Ext.container.Viewport', {
        border: false,
        layout: { type: 'hbox',align: 'stretch' },
        items: [Ext.create('Ext.Panel', {
            split: true,
            width: 250,
            layout: 'border',
            border: false,
            items: [brokers, comment]
        }),Ext.create('Ext.Panel', {
            split: true,
            flex: 1,
            layout: 'border',
            border: false,
            items: [gridCost, gridMonth]
        })],
        loadBrokers: (data)=>{brokers.getStore().setData(data);},
        setBrokerComment: (text)=>{comment.setComment(text);},
        loadCostValues: (data)=>{gridCost.getStore().setData(data);},
        loadMonthValues: (data)=>{gridMonth.getStore().setData(data);}
    });
}
function brokersPanel(){
    return Ext.create('Ext.grid.Panel', {
        title: 'Brokers',
        split: true,
        flex: 1,
        region: 'center',
        columnLines: true,
        tools: [{
            type:'plus',
            tooltip: 'Add',
            handler: addBroker
        },{
            type:'refresh',
            tooltip: 'Reload',
            handler: getBrokers
        }],
        store: Ext.create('Ext.data.Store', {
            fields:[ 'id', 'id_task', 'name_rus', 'name_eng'],
            autoLoad: true,
            data: []
        }),
        columns: [
            { text: 'ID', dataIndex: 'id', hidden: true },
            { text: 'Name Eng', dataIndex: 'name_eng', flex: 1, menuDisabled: true },
            { text: 'Name Fra', dataIndex: 'name_fra', flex: 1, menuDisabled: true }
        ],
        listeners: {
            'rowclick': function(grid, rec){
                mainPanel.setBrokerComment("Comment for " + rec.get('name_eng'));
            },
            'afterrender': getBrokers
        }
    });
}
function commentPanel(){
    var commentField=new Ext.form.field.TextArea({});
    var saveCommentBut=new Ext.Button({
        text: 'Save',
        iconCls: 'save_but',
        //disabled: true,
        handler: function(){ }
    });
    return Ext.create('Ext.Panel', {
        title: 'Comments broker',
        split: true,
        flex: 1, 
        region: 'south',
        layout: 'fit',
        items: [ commentField ],
        buttons: [ saveCommentBut],
        setComment: (text)=>{commentField.setValue(text);}
    });
}
function gridPanelCost(){
    var dateNew=Ext.create('Ext.form.field.Date', {
        allowBlank: false,
        xtype: 'datefield',
        format: 'Y-m-d',
        altFormats: 'm/d/Y' }
    );
    var grid=Ext.create('Ext.grid.Panel', {
        title: 'Data Cost',
        split: true,
        flex: 1,
        region: 'center',
        plugins: {
            ptype: 'cellediting',
            clicksToEdit: 1,
            listeners: {
                beforeedit: function(e,c){
                    if(c.field==="date_new"){
                        dateNew.setMinValue(Ext.Date.add(Ext.Date.parse(c.record.data['date1'], "Y-m-d"), Ext.Date.DAY, 1));
                        dateNew.setMaxValue(Ext.Date.add(Ext.Date.parse(c.record.data['date2'], "Y-m-d"), Ext.Date.DAY, -1));
                    }
                }
            }
        },
        store: Ext.create('Ext.data.Store', {
            fields:['id', 'id_tarif', 'name', 'date1', 'date2', 'str_tarif', 'date_new', 'val_new', 'comment_'],
            groupField: 'name',
            autoLoad: false,
            data : []
        }),
        tools: [{
            type:'refresh',
            tooltip: 'Reload',
            handler: getCostValues
        }],
        features: [{ftype:'grouping',groupHeaderTpl:'{name}'}],
        columns: {
            defaults: {menuDisabled: true, width: 75, align: 'center'},
            items: [
                {text: 'Coefficient', dataIndex: 'name', width: 100, align: 'left'},
                {text: 'Date1', dataIndex: 'date1'},
                {text: 'Date2', dataIndex: 'date2'},
                {text: 'Value', dataIndex: 'str_tarif'},
                {text: 'Date New', dataIndex: 'date_new', xtype: 'datecolumn', format:'Y-m-d', editor: dateNew },
                {text: 'Value new', dataIndex: 'val_new', editor: 'numberfield'},
                {
                    xtype: 'actioncolumn',
                    width: 25,
                    items: [{
                        icon   : 'images/add_but.png',
                        tooltip: 'Add',
                        handler: function(g,rI,cI,item,e,rec) {
                            addDataCost(rec);
                        }
                    }]
                },
                {text: 'Comment', dataIndex: 'comment_', flex: 1, align: 'left', editor: 'textfield'},
                {
                    xtype: 'actioncolumn',
                    width: 25,
                    items: [{
                        icon   : 'images/del_but.gif',
                        tooltip: 'close',
                        handler: function(g,rI,cI,item,e,rec) {
                            alert("close");
                        }
                    }]
                }
            ]
        },
        listeners: {
            'afterrender': getCostValues
        }
    });
    return grid;
}
function gridPanelMonth(){
    let dateNew=Ext.create('Ext.form.field.Date', {
        allowBlank: false,
        xtype: 'datefield',
        format: 'Y-m-d',
        altFormats: 'm/d/Y' }
    );
    let listMonth = Ext.create('Ext.form.ComboBox', {
        store: Ext.create('Ext.data.Store', {
            fields: ['id', 'name'],
            data: [["1", "1 month"], ["2", "2 month"], ["3", "3 month"], ["4", "4 month"]]
        }),
        queryMode: 'local',
        displayField: 'name',
        editable: false
    });
    let listBl = Ext.create('Ext.form.ComboBox', {
        store: Ext.create('Ext.data.Store', {
            fields: ['id', 'name'],
            data: [["1", "BLc1"], ["2", "BLc2"], ["3", "BLc3"], ["4", "BLc4"]]
        }),
        queryMode: 'local',
        displayField: 'name',
        editable: false
    });
    let grid = Ext.create('Ext.grid.Panel', {
        title: 'Data Month',
        split: true,
        flex: 2,
        region: 'south',
        plugins: {
            ptype: 'cellediting',
            clicksToEdit: 1,
            listeners: {
                beforeedit: function(e,c){
                    if(c.field==="date_new"){
                        dateNew.setMinValue(Ext.Date.add(Ext.Date.parse(c.record.data['date1'], "Y-m-d"), Ext.Date.DAY, 1));
                        dateNew.setMaxValue(Ext.Date.add(Ext.Date.parse(c.record.data['date2'], "Y-m-d"), Ext.Date.DAY, -1));
                    }
                }
            }
        },
        store: Ext.create('Ext.data.Store', {
            fields:['id', 'id_trader', 'name_trader', 'id_condition', 'name_condition', 'date1', 'date2',
                'min_val', 'max_val', 'comment_'],
            groupField: 'name_condition',
            autoLoad: false,
            remoteSort: true,
            data : []
        }),
        tools: [{
            type:'plus',
            tooltip: 'Add',
            handler: addDataMonth
        },{
            type:'refresh',
            tooltip: 'Reload',
            handler: getMonthValues
        }],
        features: [{ftype:'grouping', groupHeaderTpl:'{name}'}],
        columns: {
            defaults: {menuDisabled: true, width: 75, align: 'center'},
            items: [
                {text: 'Coefficient', dataIndex: 'name_condition', width: 100, align: 'left'},
                {text: 'Broker', dataIndex: 'name_trader', flex: 1},
                {text: 'Euronext', dataIndex: 'euronext', hidden: true},
                {text: 'Str tarif', dataIndex: 'str_tarif', hidden: true},
                {text: 'Date 1', dataIndex: 'date1'},
                {text: 'Date 2', dataIndex: 'date2'},
                {text: 'Value', dataIndex: 'max_val'},
                {text: 'Months', dataIndex: 'months', width: 90, editor: listMonth},
                {text: 'Bl', dataIndex: 'bl', width: 90, editor: listBl},
                {text: 'Date New', dataIndex: 'date_new', xtype: 'datecolumn', format:'Y-m-d', editor: dateNew},
                {text: 'Value New', dataIndex: 'val_new', width: 90, editor: 'numberfield'},
                {text: 'Comment', dataIndex: 'comment_', flex: 2, align: 'left', editor: 'textfield'},
                {
                    xtype: 'actioncolumn',
                    width: 25,
                    items: [{
                        icon   : 'images/del_but.gif',
                        tooltip: 'Close',
                        handler: function(g,rI,cI) {
                            alert("Close");
                        }
                    }]
                },
            ]
        },
        listeners: {
            'afterrender': getMonthValues
        }
    });
    return grid;
}

function addBroker(){
    let win = Ext.create('Ext.window.Window', {
        title: vcbl[lang].add_trader_title,
        modal: true,
        layout: 'fit',
        items: [{
            xtype: 'form',
            frame: true,
            url: 'index.php',
            method: 'POST',
            baseParams: { 'codex': 'addBroker' },
            defaults: { xtype: 'textfield', width: 400 },
            items: [
                { name: 'name_eng', fieldLabel: 'Name eng', value: '', id: 'name_eng', allowBlank: false },
                { name: 'name_fra', fieldLabel: 'Name fra', value: '', allowBlank: false }
            ],
            buttons: [{
                id: 'save_new_broker',
                text: vcbl[lang].save_button_title,
                disabled: true,
                formBind: true,
                handler: function(){
                    this.up('form').getForm().submit({
                        success: function(form, action) {
                            win.close();
                            mainPanel.reloadTrader();
                        },
                        failure: function(form, action) {
                            Ext.Msg.alert(vcbl[lang].title_alert_error, action.result ? action.result.message : 'No response');
                        }
                    });
                }
            }]
        }]
    }).show();
    Ext.getCmp('name_eng').focus();
}
function addDataCost(rec){
    if(!rec.get('date_new') || !rec.get('val_new')){
        return false;
    }
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: {
            codex: 'addDataCost',
            lang: lang,
            name: rec.get('name'),
            date_new: Ext.Date.format(rec.get('date_new'), 'Y-m-d'),
            val_new: rec.get('val_new')
        },
        success: function(response){
            getCostValues();
        },
        failure: function(response){
            Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed);
        }
    });
}
function addDataMonth(){
    let win = Ext.create('Ext.window.Window', {
        title: 'Add data month',
        modal: true,
        layout: 'fit',
        resizable: false,
        items: [{
            xtype: 'form',
            frame: true,
            url: 'index.php',
            method: 'POST',
            baseParams: { 'codex': 'addBroker' },
            defaults: { xtype: 'textfield', width: 400 },
            items: [
                Ext.create('Ext.form.ComboBox', {
                    name: 'coefficient',
                    fieldLabel: "Coefficient",
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'name'],
                        data : sprAr.coefficients
                    }),
                    queryMode: 'local',
                    displayField: 'name',
                    editable: false,
                    valueField: 'id'
                }),
                Ext.create('Ext.form.ComboBox', {
                    name: 'broker',
                    fieldLabel: "Broker",
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'name'],
                        data : sprAr.brokers
                    }),
                    queryMode: 'local',
                    displayField: 'name',
                    editable: false,
                    valueField: 'id'
                }),
                Ext.create('Ext.form.field.Tag', {
                    name: 'months',
                    fieldLabel: "Months",
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'name'],
                        data: [["1", "1 month"], ["2", "2 month"], ["3", "3 month"], ["4", "4 month"]]
                    }),
                    queryMode: 'local',
                    displayField: 'name',
                    editable: false,
                    valueField: 'id'
                }),
                Ext.create('Ext.form.ComboBox', {
                    name: 'bl',
                    fieldLabel: "Bl",
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'name'],
                        data: [["1", "BLc1"], ["2", "BLc2"], ["3", "BLc3"], ["4", "BLc4"]]
                    }),
                    queryMode: 'local',
                    displayField: 'name',
                    editable: false,
                    valueField: 'id'
                }),
                { name: 'value', fieldLabel: 'Value', value: '', allowBlank: false },
            ],
            buttons: [{
                id: 'save_new_broker',
                text: vcbl[lang].save_button_title,
                disabled: true,
                formBind: true,
                handler: function(){
                    this.up('form').getForm().submit({
                        success: function(form, action) {
                            win.close();
                            mainPanel.reloadTrader();
                        },
                        failure: function(form, action) {
                            Ext.Msg.alert(vcbl[lang].title_alert_error, action.result ? action.result.message : 'No response');
                        }
                    });
                }
            }]
        }]
    }).show();
}

function addValue(){
    let win = Ext.create('Ext.window.Window', {
        title: vcbl[lang].add_value,
        modal: true,
        layout: 'fit',
        items: [{
            xtype: 'form',
            frame: true,
            url: 'index.php',
            method: 'POST',
            baseParams: { 'codex': 'addValue', lang: lang },
            defaults: { xtype: 'textfield', width: 400, allowBlank: false, labelWidth: 115 },
            items: [Ext.create('Ext.form.ComboBox', {
                name: 'id_basis',
                fieldLabel: vcbl[lang].select_basis,
                store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data : sprAr.basis
                }),
                queryMode: 'local',
                displayField: 'name',
                editable: false,
                valueField: 'id'
            }),Ext.create('Ext.form.ComboBox', {
                name: 'id_product',
                fieldLabel: vcbl[lang].select_product,
                store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data : sprAr.product
                }),
                queryMode: 'local',
                displayField: 'name',
                editable: false,
                valueField: 'id'
            }),Ext.create('Ext.form.ComboBox', {
                name: 'id_terms',
                fieldLabel: vcbl[lang].select_terms,
                store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data : sprAr.terms
                }),
                queryMode: 'local',
                displayField: 'name',
                editable: false,
                valueField: 'id'
            }),Ext.create('Ext.form.ComboBox', {
                name: 'id_currency',
                fieldLabel: vcbl[lang].select_currency,
                store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data : sprAr.currency
                }),
                queryMode: 'local',
                displayField: 'name',
                editable: false,
                valueField: 'id'
            }),Ext.create('Ext.form.ComboBox', {
                name: 'id_trader',
                fieldLabel: vcbl[lang].select_trader,
                store: Ext.create('Ext.data.Store', {
                    fields: ['id', lang === 'rus' ? 'name_rus' : 'name_eng'],
                    data : traderAr
                }),
                queryMode: 'local',
                displayField: lang === 'rus' ? 'name_rus' : 'name_eng',
                editable: false,
                valueField: 'id'
            })],
            buttons: [{
                id: 'save_new_value',
                text: vcbl[lang].save_button_title,
                disabled: true,
                formBind: true,
                handler: function(){
                    this.up('form').getForm().submit({
                        success: function(form, action) {
                            mainPanel.gridP.getStore().removeAll();
                            mainPanel.gridP.getStore().load();
                            win.close();
                        },
                        failure: function(form, action) {
                            Ext.Msg.alert(vcbl[lang].title_alert_error, action.result ? action.result.message : 'No response');
                        }
                    });
                }
            }]
        }]
    }).show();
}
function getTimeForMonitor(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'timeMonitor' },
        success: function(response){
            var ans=response.responseText.split(",");
            finishTime=[ans[0]*1,ans[1]*1,ans[2]*1];
            task={ run: function(){ timerWork(); }, interval: 1000 };
            Ext.TaskManager.start(task);
            timerWork();
        },
        failure: function(response){ Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed); }
    });
}
function timerWork(){
    if(finishTime[2]===0){ window.location.reload(false); }
    
    if(finishTime[0]>0 && finishTime[1]>0){
        Ext.TaskManager.stop(task);
        getTimeForMonitor();
        return false;
    }
    var text="";
    if(finishTime[0]<0 && finishTime[2]>0){
        text='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[<span class="enable_edit">'+vcbl[lang].until_end_data_entry+': '+parseTimeForTitle(finishTime[0])+'</span>]';
    } else if(finishTime[2]<0){
        text='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[<span class="disable_edit">'+vcbl[lang].until_start_data_entry+': '+parseTimeForTitle(finishTime[2])+'</span>]';
    } else if(finishTime[1]<0){
        text='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[<span class="disable_edit">'+vcbl[lang].until_start_data_entry+': '+parseTimeForTitle(finishTime[1])+'</span>]'; 
    }
    finishTime=[finishTime[0]+1,finishTime[1]+1,finishTime[2]+1];
    mainPanel.gridP.changeTitle(text);
}
function parseTimeForTitle(val){
    if(val<0)val=val*-1;
    var hour=(val/3600).toString().split(/\./)[0];
    var min=((val-hour*3600)/60).toString().split(/\./)[0];
    var sec=val-hour*3600-min*60;
    if(min<10)min="0"+min;
    if(sec<10)sec="0"+sec;
    return '<span class="digit">'+hour+':'+min+':'+sec+'</span>';
}

function getBrokers(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'getBrokers', lang: lang },
        success: function(response){
            mainPanel.loadBrokers(JSON.parse(response.responseText));
        },
        failure: function(response){
            Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed);
        }
    });
}
function getMonthValues(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'getMonthValues', lang: lang },
        success: function(response){
            mainPanel.loadMonthValues(JSON.parse(response.responseText));
        },
        failure: function(response){
            Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed);
        }
    });
}
function getCostValues(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'getCostValues', lang: lang },
        success: function(response){
            mainPanel.loadCostValues(JSON.parse(response.responseText));
        },
        failure: function(response){
            Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed);
        }
    });
}
function getSpr(){
    Ext.Ajax.request({
        url: 'index.php',
        method: 'POST',
        params: { codex: 'getSpr', lang: lang },
        success: function(response){
            sprAr = JSON.parse(response.responseText);
        },
        failure: function(response){ Ext.Msg.alert(vcbl[lang].title_alert_error, vcbl[lang].data_transfer_failed); }
    });
}