<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

include "connDB.php";
$glTempAr=array();
$endTime="18:00:00";
$nextDayBeginTime="11:05:00";
$reloadTime="11:05:00";
$id_user=0;
session_start();

function viewPage(){
    echo '<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Wheat Rouen</title>
    
    <link href="css/resources/theme-classic-all.css" rel="stylesheet" type="text/css"/>
    <link href="css/resources/theme-classic-all_1.css" rel="stylesheet" type="text/css"/>
    <link href="css/resources/theme-classic-all_2.css" rel="stylesheet" type="text/css"/>
    <link href="css/edit.css" rel="stylesheet" type="text/css"/>
    
    <script type="text/javascript"> var lang="eng"; </script>
    <script src="scripts/vcbl.js" type="text/javascript"></script>
    <script src="scripts/ext-all.js" type="text/javascript"></script>
    <script src="scripts/locale-eng.js" type="text/javascript"></script>
    <script src="scripts/index.js" type="text/javascript"></script>
</head>
<body>
</body>
</html>';
}

if(isset($_POST['codex']) && $_POST['codex']!='auth'){
    $res=mysqli_query($linkdb,"select DISTINCT u.id,u.name from users u,USER_OBLAST uo where u.session='".parseVal(session_id())."' AND uo.ID_TASK=5 AND u.id=uo.ID_USER");
    if(mysqli_num_rows($res)==1){
        $row=mysqli_fetch_array($res);
        $id_user=$row['id'];
        if($_POST['codex']=='authSession') {echo 1;}
    } else {exit("Пользователь не авторизован!");}
}

function getBrokers(){
    global $linkdb;
    $res = mysqli_query($linkdb, "SELECT ID, ID_TASK, NAME, NAME_EXT, DATE_UPD FROM OPERATOR_OTHER");
    $ans = array();
    if(mysqli_num_rows($res) > 0){
        while($row = mysqli_fetch_array($res)){
            $ans[] = array('id' => $row["ID"], 'id_task' => $row["ID_TASK"], 'name_eng' => $row["NAME"], 'name_fra' => $row["NAME_EXT"]);
        }
    }
    echo json_encode($ans);
}
function getMonthValues(){
    global $linkdb;
    $res = mysqli_query($linkdb,
"SELECT
  ID, ID_TRADER, TRADER, ID_CONDITION, `CONDITION`, EURONEXT, STR_TARIF, DATE1,
  DATE2, MIN_VAL, MAX_VAL, COMMENT_, DATE_UPD
FROM LAST_FR_PREMIUM order by ID_CONDITION");
    $ans = array();
    if(mysqli_num_rows($res) > 0){
        while($row = mysqli_fetch_array($res)){
            $ans[] = array(
                'id' => $row["ID"],
                'id_trader' => $row["ID_TRADER"],
                'name_trader' => $row["TRADER"],
                'id_condition' => $row["ID_CONDITION"],
                'name_condition' => $row["CONDITION"],
                'euronext' => $row["EURONEXT"],
                'str_tarif' => $row["STR_TARIF"],
                'date1' => $row["DATE1"],
                'date2' => $row["DATE2"],
                'min_val' => $row["MIN_VAL"],
                'max_val' => $row["MAX_VAL"],
                'comment_' => $row["COMMENT_"]
            );
        }
    }
    echo json_encode($ans);
}
function getCostValues(){
    global $linkdb;
    $res = mysqli_query($linkdb,
"SELECT ID, ID_TARIF, NAME, DATE1, DATE2, STR_TARIF, COMMENT_, DATE_UPD
FROM LAST_FR_COST");
    $ans = array();
    if(mysqli_num_rows($res) > 0){
        while($row = mysqli_fetch_array($res)){
            $ans[] = array(
                //'id' => $row["ID"],
                'id_tarif' => $row["ID_TARIF"],
                'name' => $row["NAME"],
                'date1' => $row["DATE1"],
                'date2' => $row["DATE2"],
                'str_tarif' => $row["STR_TARIF"],
                'comment_' => $row["COMMENT_"]
            );
        }
    }
    echo json_encode($ans);
}
function getSpr(){
    $ans=array();
    $ans["coefficients"] = runQuery("SELECT DISTINCT ID_CONDITION id, `CONDITION` name FROM LAST_FR_PREMIUM");
    $ans["brokers"] = runQuery("SELECT id, name FROM OPERATOR_OTHER");
    echo json_encode($ans);
}
function addBroker(){
    if(!isset($_POST['name_eng']) || !isset($_POST['name_fra'])){
        echo '{"success": false, "message": "not parameters"}';
    } else {
        $name_eng = parseVal(trim($_POST['name_eng']));
        $name_fra = parseVal(trim($_POST['name_fra']));
        $res = runQuery("select * from OPERATOR_OTHER where NAME='".$name_eng."'");
        if(count($res) > 0){
            echo '{"success": false, "message": "Трейдер с таким названием уже существует!"}';
        } else {
           $query = "insert into OPERATOR_OTHER (ID_TASK, NAME, NAME_EXT, DATE_UPD) values (1, '".$name_eng."', '".$name_fra."', NOW())";
           runQuery($query, true);
           echo '{"success": true}';
        }
    }
}
function addDataCost(){
    if(!isset($_POST['name']) || !isset($_POST['date_new']) || !isset($_POST['val_new'])){
        echo '{"success": false, "message": "not parameters"}';
    } else if($_POST['name']=="" || $_POST['date_new']=="" || $_POST['val_new']==""){
        echo '{"success": false, "message": "not parameters"}';
    } else {
        $name = parseVal(trim($_POST['name']));
        $date_new = parseVal(trim($_POST['date_new']));
        $val_new = parseVal(trim($_POST['val_new']));
        $res = runQuery("SELECT * FROM LAST_FR_COST WHERE
NAME='".$name."' AND STR_TO_DATE('".$date_new."', '%Y-%m-%d') BETWEEN DATE1 AND DATE2");
        if(count($res) > 1){
            echo '{"success": false, "message": "Дата входит в более чем один диапазон!"}';
        } else {
            $query = "UPDATE LAST_FR_COST set DATE2=STR_TO_DATE('".$date_new."', '%Y-%m-%d') - INTERVAL 1 DAY, DATE_UPD=NOW()
WHERE NAME='".$name."' AND STR_TO_DATE('".$date_new."', '%Y-%m-%d') BETWEEN DATE1 AND DATE2";
            runQuery($query, true);
            $query = "INSERT INTO LAST_FR_COST (ID,ID_TARIF,NAME,DATE1,DATE2,STR_TARIF,COMMENT_,DATE_UPD)
VALUES (0,0,'".$name."',STR_TO_DATE('".$date_new."', '%Y-%m-%d'),STR_TO_DATE('2100-01-01', '%Y-%m-%d'),'".$val_new."','',NOW())";
            runQuery($query, true);
            echo '{"success": true}';
        }
    }
}

function getTree(){
    global $linkdb,$glTempAr;
    if(count($glTempAr)==0) {getAllBasis($_POST['lang']);}
    $res=mysqli_query($linkdb,"SELECT ID, ".($_POST['lang'] == "rus" ? "NAME" : "NAMEE")." NAME FROM BASIS_AGRICULTURE WHERE ID=OWNER");
    $ans=array();
    if(mysqli_num_rows($res)>0){
        while($row=mysqli_fetch_array($res)){
            $temp="{text: '".$row["NAME"]."'";
            $child=getSubTree($row['ID'], $_POST['lang']);
            if($child!="") {$temp.=",expanded:true,idBasis:".$row['ID'].",children:[".$child."]}";}
            else {$temp.=",leaf:true,idBasis:".$row['ID']."}";}
            $ans[]=$temp;
        }
        echo "[".implode(",",$ans)."]";
    } else { echo "[]"; }
}
function getSubTree($idBasis){
    global $glTempAr;
    $ans=array();
    if(isset($glTempAr[$idBasis]) && count($glTempAr[$idBasis])>0){
        foreach ($glTempAr[$idBasis] as $key=>$value) {
            $child=getSubTree($value["ID"]);
            if($child!=""){
                $ans[]="{text: '".$value["NAME"]."',expanded:true,idBasis:".$value["ID"].",id_terms:0,children:[".$child."]}";
            } else {
                $ans[]="{text: '".$value["NAME"]."',expanded:true,idBasis:".$value["ID"].",id_terms:0,children:[".getSubTreeWithTerms($value)."]}";
            }
        }
    }
    return implode(",",$ans);
}
function getSubTreeWithTerms($value){
    $ans=array();
    $ans[]="{text: '".$value["NAME"]." (CPT)',leaf:true,idBasis:".$value["ID"].",id_terms:7,terms:'CPT'}";
    $ans[]="{text: '".$value["NAME"]." (FOB)',leaf:true,idBasis:".$value["ID"].",id_terms:4,terms:'FOB'}";
    return implode(",",$ans);
}
function getGrid(){
    if(!isset($_POST['idBasis']) || $_POST['idBasis']==0) { echo "[]"; return false;}
    global $linkdb,$glTempAr;
    if(count($glTempAr)==0) {getAllBasis($_POST['lang']);}
    $act="";
    if(isset($_POST['act']) && $_POST['act']=="true"){$act=" AND lap.ID IS NOT NULL";}
    $id_terms="";
    if(isset($_POST['id_terms']) && $_POST['id_terms']*1>0){$id_terms=" AND lap.ID_TERMS=".parseVal($_POST['id_terms']);}
    $name_trader = 'NAME_RUS';
    if(isset($_POST['lang']) && $_POST['lang']=='eng'){ $name_trader = 'NAME_ENG'; }
    $query = "SELECT lap.*, st.".$name_trader." name_trader, ba.".($_POST['lang']=='eng' ? 'NAMEE' : 'NAME')." NAME_BASIS,
UPPER(sc.".($_POST['lang']=='eng' ? 'NAMEE' : 'NAME').") NAME_COUNTRY, IFNULL(sp.".($_POST['lang'] == 'eng'?"NAMEE":"NAME").", 'NULL') NAME_PRODUCT
FROM LAST_AGRICULTURE_PRICE lap
LEFT JOIN SPR_PRODUCT sp ON lap.ID_PRODUCT=sp.ID_PRODUCT
LEFT JOIN SPR_TRADER st ON lap.ID_TRADER=st.ID
LEFT JOIN BASIS_AGRICULTURE ba ON ba.ID=lap.ID_BASIS
LEFT JOIN SPR_COUNTRY sc ON sc.ID=lap.ID_COUNTR_ORIG
WHERE lap.ID_BASIS in (".getChildBasis(parseVal($_POST['idBasis'])).")".$act.$id_terms." ORDER BY ID_TRADER";
    $res=mysqli_query($linkdb, $query);
    if(mysqli_num_rows($res)>0){
        $ans=array();
        while($row=mysqli_fetch_array($res)){
            $ans[]="{".
"inner_id:".$row['INNER_ID'].",".
"rec_id:".($row['ID']==""?0:$row['ID']).",".
"status:'".($row['ID']?'<img src="images/accept.png" title="Актуальная запись"/>':'<img src="images/cancel_but.png" title="Не актуальная запись"/>')."',".
"id_basis:".$row['ID_BASIS'].",".
"basis:'".$row['NAME_BASIS']."',".
"id_prod:".$row['ID_PRODUCT'].",".
"prod:'".$row['NAME_PRODUCT']."',". //"prod:'".$row['NPRODUCT']."',".
"id_country:".$row['ID_COUNTR_ORIG'].",".
"country:'".$row['NAME_COUNTRY']."',".
"id_terms:".$row['ID_TERMS'].",".
"terms:'".$row['NTERMS']."',".
"id_currency:".$row['ID_CURRENCY'].",".
"currency:'".$row['NCURRENCY']."',".
"date1:'".$row['DATE1']."',".
"date2:'".$row['DATE2']."',".
"val_min:".($row['VAL_MIN']==""?"''":$row['VAL_MIN']*1).",".
"val_max:".($row['VAL_MAX']==""?"''":$row['VAL_MAX']*1).",".
"date_new:'".$row['DATE_NEW']."',".
"val_min_new:".($row['VAL_MIN_NEW']==""?"''":$row['VAL_MIN_NEW']*1).",".
"val_max_new:".($row['VAL_MAX_NEW']==""?"''":$row['VAL_MAX_NEW']*1).",".
"id_trader:".$row['ID_TRADER'].",".
"name_trader:'".$row['name_trader']."',".
"comm_rus:'".$row['COMMENT_RUS']."',".
"comm_eng:'".$row['COMMENT_ENG']."'}";
        }
        echo "[".implode(",",$ans)."]";
    } else { echo "[]"; }
}
function addValue(){
    $id_basis = parseVal($_POST['id_basis']);
    $id_product = parseVal($_POST['id_product']);
    $id_terms = parseVal($_POST['id_terms']);
    $id_currency = parseVal($_POST['id_currency']);
    $id_trader = parseVal($_POST['id_trader']);
    $query = "select * from LAST_AGRICULTURE_PRICE where ID_BASIS=".$id_basis." and ID_PRODUCT=".$id_product." and 
ID_TERMS=".$id_terms." and ID_CURRENCY=".$id_currency." and ID_TRADER=".$id_trader;
    if(count(runQuery($query))>0){
        echo '{"success": false, "message": '.($_POST['lang']=='eng'?'"Already exists"':'"Уже существует"').'}';
    } else {
        $query = "INSERT INTO LAST_AGRICULTURE_PRICE
(ID_BASIS, NBASIS, ID_PRODUCT, NPRODUCT, ID_COUNTR_ORIG, NCOUNTRY, ID_TERMS, NTERMS, ID_CURRENCY, NCURRENCY, ID_TRADER)
VALUES
(
".$id_basis.",
(select NAME from BASIS_AGRICULTURE where ID=".$id_basis."),
".$id_product.",
(select DISTINCT lap.NPRODUCT FROM LAST_AGRICULTURE_PRICE lap WHERE lap.ID_PRODUCT=".$id_product."),
(select ID_COUNTRY from BASIS_AGRICULTURE where ID=".$id_basis."),
(select UPPER(NAME) from SPR_COUNTRY where ID=(select ID_COUNTRY from BASIS_AGRICULTURE where ID=".$id_basis.")),
".$id_terms.",
(select DISTINCT lap.NTERMS FROM LAST_AGRICULTURE_PRICE lap where lap.ID_TERMS=".$id_terms."),
".$id_currency.",
(select DISTINCT lap.NCURRENCY FROM LAST_AGRICULTURE_PRICE lap WHERE lap.ID_CURRENCY=".$id_currency."),
".$id_trader.")";
        runQuery($query, true);
        echo '{"success": true}';
    }
}

function getTraderList(){
    echo json_encode(runQuery("select * from SPR_TRADER order by ".($_POST['lang']=='rus'?'name_rus':'name_eng')));
}
function addTrader(){
    if(!isset($_POST['name_rus']) || !isset($_POST['id_trader'])){
        echo '{"success": false, "message": "not parameters"}';
    } else {
        $name_rus = parseVal(trim($_POST['name_rus']));
        $name_eng = parseVal(trim($_POST['name_eng']));
        $id_trader = parseVal(trim($_POST['id_trader']))*1;
        $res = runQuery("select * from SPR_TRADER where name_rus='".$name_rus."' and id!=".$id_trader);
        if(count($res) > 0){
            echo '{"success": false, "message": "Трейдер с таким названием уже существует!"}';
        } else {
           if($id_trader > 0){
               $query = "update SPR_TRADER set name_rus='".$name_rus."', name_eng='".$name_eng."', date_upd=NOW() where id=".$id_trader;
           } else {
               $query = "insert into SPR_TRADER (name_rus, name_eng) values ('".$name_rus."', '".$name_eng."')";
           }
           runQuery($query, true);
           echo '{"success": true}';
        }
    }
}
function getChildBasis($idBasis){
    global $glTempAr;
    $ans=array($idBasis);
    if(isset($glTempAr[$idBasis]) && count($glTempAr[$idBasis])>0){
        foreach ($glTempAr[$idBasis] as $key=>$value) {
            $ans[]=getChildBasis($value["ID"]);
        }
    }
    return implode(",",$ans);
}
function getAllBasis($lang){
    global $linkdb, $glTempAr;
    $res=mysqli_query($linkdb,"SELECT ID, OWNER, ".($lang == "rus" ? "NAME" : "NAMEE")." NAME FROM BASIS_AGRICULTURE WHERE ID!=OWNER");
    if(mysqli_num_rows($res)>0){
        while($row=mysqli_fetch_array($res)){
            if(!isset($glTempAr[$row['OWNER']])) {$glTempAr[$row['OWNER']]=array(array("ID"=>$row['ID'],"NAME"=>$row['NAME']));}
            else {$glTempAr[$row['OWNER']][]=array("ID"=>$row['ID'],"NAME"=>$row['NAME']);}
        }
    }
}
function auth(){
    global $linkdb;
    $res=mysqli_query($linkdb,"SELECT DISTINCT u.id,u.name from users u,USER_OBLAST uo where u.login='".parseVal($_POST['login'])."' and u.pass='".parseVal($_POST['password'])."' AND u.id=uo.ID_USER AND uo.ID_TASK=5");
    if(mysqli_num_rows($res)==1){
        $row=mysqli_fetch_array($res);
        mysqli_query($linkdb,"update users set session='".session_id()."',lastvisit=NOW() where id=".$row['id'].";");
        echo 1;
    } else {echo 0;}
}
function parseVal($val){
    $ar=array(">","<","union");
    return str_replace("'","''",str_replace($ar,'',$val));
}
function runQuery($query, $run_only=false, $type_result=MYSQLI_ASSOC){
    global $linkdb;
    $ans = array();
    $res = mysqli_query($linkdb, $query);
    if(!$run_only){
        while($row = mysqli_fetch_array($res, $type_result)){ $ans[] = $row; }
    }
    return $ans;
}
function setDataField(){
    global $linkdb,$id_user;
    $inner_id=parseVal($_POST['inner_id'])*1;
    $updStr=array();
    if(isset($_POST['date_new'])) {
        if($_POST['date_new']=="") {$updStr[]="DATE_NEW=null";}
        else {$updStr[]="DATE_NEW=STR_TO_DATE('".parseVal($_POST['date_new'])."','%Y-%m-%d')";}
    }
    if(isset($_POST['val_min_new'])) {$updStr[]="VAL_MIN_NEW=".parseVal($_POST['val_min_new']==""?"null":$_POST['val_min_new']);}
    if(isset($_POST['val_max_new'])) {$updStr[]="VAL_MAX_NEW=".parseVal($_POST['val_max_new']==""?"null":$_POST['val_max_new']);}
    if(isset($_POST['comm_rus'])) {$updStr[]="COMMENT_RUS=".($_POST['comm_rus']==""?"null":"'".parseVal($_POST['comm_rus'])."'").",FLAG_COM_UPD=1";}
    if(isset($_POST['comm_eng'])) {$updStr[]="COMMENT_ENG=".($_POST['comm_eng']==""?"null":"'".parseVal($_POST['comm_eng'])."'").",FLAG_COM_UPD=1";}
    if(count($updStr)==0) {return false;}
    
    $query="update LAST_AGRICULTURE_PRICE set ".implode(",",$updStr).",ID_USER=".$id_user.",DATE_UPD=NOW() where INNER_ID=".$inner_id.";";
    mysqli_query($linkdb,$query);
    echo 1;
}
function timeMonitor(){
    global $linkdb,$endTime,$nextDayBeginTime,$reloadTime;
    $res=mysqli_query($linkdb,"select UNIX_TIMESTAMP()-UNIX_TIMESTAMP(CONCAT(DATE_FORMAT(NOW(),'%Y-%m-%d'),' ".$endTime."')) delta,
UNIX_TIMESTAMP()-UNIX_TIMESTAMP(CONCAT(DATE_FORMAT(NOW()+INTERVAL 1 DAY,'%Y-%m-%d'),' ".$nextDayBeginTime."')) delta2,
UNIX_TIMESTAMP()-UNIX_TIMESTAMP(CONCAT(DATE_FORMAT(NOW(),'%Y-%m-%d'),' ".$reloadTime."')) delta3");
    $row=mysqli_fetch_array($res);
    echo $row['delta'].",".$row['delta2'].",".$row['delta3'];
}
if(isset($_POST['codex'])){
    switch($_POST['codex']){
        case 'getTree': getTree(); break;
        case 'getGrid': getGrid(); break;
        case 'getTraderList': getTraderList(); break;
        case 'addTrader': addTrader(); break;
        case 'addValue': addValue(); break;
        case 'auth': auth(); break;
        case 'setDataField': setDataField(); break;
        case 'timeMonitor': timeMonitor(); break;
        case 'getSpr': getSpr(); break;
        
        case 'getBrokers': getBrokers(); break;
        case 'getMonthValues': getMonthValues(); break;
        case 'getCostValues': getCostValues(); break;
        case 'getCoefficients': getCoefficients(); break;
        case 'addBroker': addBroker(); break;
        case 'addDataCost': addDataCost(); break;
    
        default: break;
    }
} else {
    viewPage();
}
?>