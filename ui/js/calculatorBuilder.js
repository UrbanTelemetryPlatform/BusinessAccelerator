

var calculatorConfig;
var nodesInGroups;

function initializeCalculator(){

    var that = this;
    jQuery.ajax({
        url : "data/uta.json",
        success : function(result){
            resultData = JSON.parse(result);
            that.calculatorConfig = resultData;
            buildUpGroups();
        }
    });

   
}

function buildUpGroups(){    

    var that = this;

    $.get("partials/group.html",function(data){
        var groupTemplate = $(data);
        
        for(var i in that.calculatorConfig.groups){
            var group = that.calculatorConfig.groups[i];
            var groupElement = groupTemplate.clone();
            groupElement.find(".grouptitle").text(group.title);

            if(group.recolor !== undefined){
                groupElement.find(".grouptitle").css("background-color",group.recolor)
                groupElement.css("border-left-color",group.recolor)
            }

            if(group.type == "result"){
                $("#resultcontainer").append(groupElement);
            } else {
                $("#calccontainer").append(groupElement);
            }
            buildNodesForGroup(group, groupElement);

            if(group.closedOnStart){
                groupElement.addClass("closedOnStart");
            }
        }

        finalize();
    });
}

function buildNodesForGroup(group, groupElement){

    var that = this;

    for(var i in that.calculatorConfig.nodes){
        var node = that.calculatorConfig.nodes[i];
        if(node.group == group.name){
            if(node.type=="Input"){
               buildInputNode(node, group, groupElement);
            } else if(node.type=="Calculation"){
                buildCalculationNode(node, group, groupElement);
            } else if(node.type=="Pricecomponent"){
                buildPriceComponentNode(node, group, groupElement);
             }
        }
    }
}

function buildInputNode(node, group, groupElement){
    var that = this;
    
    var nodeType = node.type;
    $.ajax({
        url: "partials/node_input.html",
        async: false,
        success : function(data){
            var nodeTemplate = $(data).clone();        
            nodeTemplate.attr("id", "nodeid_" + node.nodeID);       
            nodeTemplate.find(".nodename").text(node.name);
            nodeTemplate.find(".nodeinp").attr("placeholder", node.unitOfMeasure);
            nodeTemplate.find(".nodeinp").val(node.content.default);
            nodeTemplate.find(".nodeunit").text(node.unitOfMeasure);
             
            if(node.hint == undefined || node.hint == ""){
                nodeTemplate.find(".nodehint").hide();  
            }
            nodeTemplate.find(".nodehint").attr("title",node.hint);
            groupElement.append(nodeTemplate);
    }
    });
}

function buildCalculationNode(node, group, groupElement){
    var that = this;
    
    var nodeType = node.type;
    $.ajax({
        url: "partials/node_calculation.html",
        async: false,
        success : function(data){
            var nodeTemplate = $(data).clone();         
            nodeTemplate.attr("id", "nodeid_" + node.nodeID);       
            nodeTemplate.find(".nodename").text(node.name);
            nodeTemplate.find(".nodehint").attr("title",decodeFormula(node.content.calculation));
            nodeTemplate.find(".nodeinp").val(node.content.default);
            nodeTemplate.find(".nodeunit").text(node.unitOfMeasure);
            groupElement.append(nodeTemplate);
        }
    });
}

function buildPriceComponentNode(node, group, groupElement){
    var that = this;

    var nodeType = node.type;
    $.ajax({
        url: "partials/node_pricecomponent.html",
        async: false,
        success : function(data){
            var nodeTemplate = $(data).clone();         
            nodeTemplate.attr("id", "nodeid_" + node.nodeID);       
            nodeTemplate.find(".nodename").text(node.name);
            nodeTemplate.find(".nodehint").attr("title",decodeFormula(node.content.calculation));
            nodeTemplate.find(".nodeprice").val(node.content.currency  + " " + node.content.price);
            nodeTemplate.find(".nodeinp").val();
            nodeTemplate.find(".nodeunit").text(node.unitOfMeasure);
            groupElement.append(nodeTemplate);
        }
    });
}

function decodeFormula(formula){

    var formulaDecoded = formula;
    for(var i = this.calculatorConfig.nodes.length-1; i >= 0; i--){
        var node =  this.calculatorConfig.nodes[i];
        formulaDecoded = formulaDecoded.replace("$" + node.nodeID, " \"" + node.name + "\" ");
    }

    return formulaDecoded;
}

function finalize(){
    $(".grouptitle").click(function(){
       $(this).parent().find(".node").toggle("closed");
    }); 

    $(".inputnode").find(".nodeinp").change(function(){
        calculate(true);
    });

    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })

    calculate();
}

function calculate(showChanges){

    var that = this;

    //Get all filled values so far
    var nodeValues = {};
    for(var i in that.calculatorConfig.nodes){
        var node =  this.calculatorConfig.nodes[i];
        var value =  $("#nodeid_" + node.nodeID).find(".nodeinp").val();

        if(value == undefined)
            value = 0;
            
        nodeValues[node.nodeID] = value;
    }

    //Calculate
    for(var i in that.calculatorConfig.nodes){
        var node = that.calculatorConfig.nodes[i];

        if(node.type!=="Input"){
            
            var formula = node.content.calculation;
            var orginalFormula = formula;

            if(formula!==undefined){                
                for(var j= that.calculatorConfig.nodes.length-1; j >= 0; j--){
                    var innerNode = that.calculatorConfig.nodes[j];
                   
                    var nodeValue = nodeValues[innerNode.nodeID];
                    if(nodeValue == undefined)
                        nodeValue = 0;

                    formula = formula.replace("$" + innerNode.nodeID, nodeValue);
                    
                }
                //console.log(formula, orginalFormula);
                var resultOfFormula = eval(formula);
                nodeValues[node.nodeID] = resultOfFormula;

                if(node.type == "Pricecomponent"){
                    
                    $("#nodeid_" + node.nodeID).find(".nodepriceunits").val(roundNumber(resultOfFormula,2));
                    
                    var priceResult = resultOfFormula * node.content.price;                    
                    nodeValues[node.nodeID] = priceResult;
                    
                }
                //console.log(resultOfFormula, formula);
            }
        }
    }

    //Set all filled values so far
    for(var i in that.calculatorConfig.nodes){
        var node =  this.calculatorConfig.nodes[i];
        var value =  roundNumber(nodeValues[node.nodeID],2);
        var prevValue = $("#nodeid_" + node.nodeID).find(".nodeinp").val();

        if(node.content.currency !== undefined){
            value = node.content.currency + " " + value;
        }

        if(showChanges && prevValue != value){
            highlightNode($("#nodeid_" + node.nodeID).find(".nodeinp"));

            if(node.type == "Pricecomponent"){
                highlightNode($("#nodeid_" + node.nodeID).find(".nodepriceunits")); 
            }
        }
        
        $("#nodeid_" + node.nodeID).find(".nodeinp").val(value);

        
    }

}

function highlightNode(nodeInputElement){
    nodeInputElement.addClass("highlight");
    window.setTimeout(function(){
        nodeInputElement.removeClass("highlight");
      }, 5000);
}

function roundNumber(num, scale) {
    if(!("" + num).includes("e")) {
      return +(Math.round(num + "e+" + scale)  + "e-" + scale);
    } else {
      var arr = ("" + num).split("e");
      var sig = ""
      if(+arr[1] + scale > 0) {
        sig = "+";
      }
      return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
  }