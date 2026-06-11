(* ::Package:: *)

(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]][EchoFunction[CopyToClipboard]@ResourceFunction[ResourceObject[<|"Name" -> "RandomHypergraph", "ShortName" -> "RandomHypergraph", "UUID" -> "58287a0e-dcb0-40f9-97ff-1bdc090e0c35", "ResourceType" -> "Function", "Version" -> "1.0.0", "Description" -> "Generate a random hypergraph", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$f4f60f8a0fba45c1bc1db253851b6bb7`RandomHypergraph", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/634c0ba5-7544-4c56-bb9c-9fdbf27422ec"]|>, ResourceSystemBase -> Automatic]][{10,{20,2}}]]*)


(* ::Input:: *)
(*ClearAll[growRandomHypergraph]*)
(*growRandomHypergraph[vertices_Integer?Positive,edges_Integer?Positive,edgeRange_:All]:=Table[RandomInteger[(*Vertices:*){1,vertices},(*Length of hyperedge:*)RandomInteger[{1,If[MatchQ[edgeRange,All|Full],vertices,edgeRange]}]],vertices]*)
(*(*NestWhileList[f,RandomInteger[edgeRange,vertices],]*)*)


(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]][growRandomHypergraph[10,10,All]]*)


(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphToGraph", "ShortName" -> "HypergraphToGraph", "UUID" -> "8267b84f-863c-449c-a2ae-408b71ce21f0", "ResourceType" -> "Function", "Version" -> "2.0.0", "Description" -> "Convert a hypergraph to a graph with the same distance matrix", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$24996192c6f14a2083ec4fde0066330a`HypergraphToGraph", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/e42436b1-c8c0-4134-81cd-4fb76f8dad6d"]|>, ResourceSystemBase -> Automatic]][Join[Prepend[Partition[Range[10],3,2],{9,10,1}],{{1,2,3},{4,5,6},{7,8,9},{3,4},{6,7},{9,1}}+10,NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{21},5]]]*)


(* ::Input:: *)
(*With[*)
(*{e1=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{1},10]},*)
(*{e2=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{Max[e1]},10]-41},Join[e1,e2]]*)


(* ::Input:: *)
(*With[{steps1=20,steps2=20},*)
(*{e1=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{1},steps1]},*)
(*{e2=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{Max[e1]},steps2]-2*52},Join[e1,e2]]*)


(* ::Input:: *)
(*Manipulate[With[{steps1=20,steps2=20},*)
(*{e1=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{1},steps1]},*)
(*{e2=NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{Max[e1]},steps2]-2x},Join[e1,e2]]//*)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]],{x,0,60,1}]*)


(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]][{{1,4,2},{1,5,4},{5,2,4},{1,6,3},{2,7,6},{7,3,6},{3,8,1},{2,9,8},{9,1,8}}]*)


(* ::Input:: *)
(*CopyToClipboard[Join[Prepend[Partition[Range[10],3,2],{9,10,1}],{{1,2,3},{4,5,6},{7,8,9},{3,4},{6,7},{9,1}}+10,NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{21},5]]]*)


(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]][Join[Prepend[Partition[Range[10],3,2],{9,10,1}],{{1,2,3},{4,5,6},{7,8,9},{3,4},{6,7},{9,1}}+10,NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{21},5]]]*)


(* ::Input:: *)
(*ResourceFunction[ResourceObject[<|"Name" -> "HypergraphPlot", "ShortName" -> "HypergraphPlot", "UUID" -> "e9bc95c7-b561-4aff-a947-8443522e0d42", "ResourceType" -> "Function", "Version" -> "2.1.0", "Description" -> "Plot a hypergraph defined by a list of hyperedges", "RepositoryLocation" -> URL["https://www.wolframcloud.com/obj/resourcesystem/api/1.0"], "SymbolName" -> "FunctionRepository`$2a67f9563049497a8e41ef9793309921`HypergraphPlot", "FunctionLocation" -> CloudObject["https://www.wolframcloud.com/obj/b88820ff-b927-4da6-8fec-0572fba10326"]|>, ResourceSystemBase -> Automatic]][Join[Prepend[Partition[Range[10],3,2],{9,10,1}],{{1,2,3},{4,5,6},{7,8,9},{3,4},{6,7},{9,1}}+10,NestList[Table[Last[#]+1+i,{i,0,Length[#]}]&,{21},5]]]*)


(* ::Input:: *)
(*With[{nPhrases=100,phraseLength=10},{words=RandomWord[100]},*)
(*Partition[StringRiffle/@Partition[RandomWord[phraseLength*nPhrases],phraseLength],4,3]]//CopyToClipboard*)


(* ::Input:: *)
(*ResourceFunction["HypergraphPlot"]@Partition[RandomWord[100],4,3]*)


(* ::Input:: *)
(*Graph[RandomGraph[BernoulliGraphDistribution[40, 0.07]], VertexSize -> Medium, VertexStyle -> RGBColor[0., 0.48, 0.65], *)
(*  EdgeStyle -> Directive[Opacity[0.25], RGBColor[0., 0.48, 0.65]]]*)
