(* Wolfram Language Hypergraph Examples *)

(* 1. Fano Plane (7 vertices, 7 hyperedges of size 3) *)

fanoPlane = {{1, 2, 3}, {3, 4, 5}, {1, 5, 6}, {1, 4, 7}, {2, 5, 7}, {
  3, 6, 7}, {2, 4, 6}};

(* 2. Hypergraph Cycle / Ring (8 vertices, 8 hyperedges of size 3) *)

hypergraphCycle = {{1, 2, 3}, {3, 4, 5}, {5, 6, 7}, {7, 8, 1}, {2, 3,
   4}, {4, 5, 6}, {6, 7, 8}, {8, 1, 2}};

(* 3. Star Hypergraph (10 vertices, 4 overlapping hyperedges of different sizes sharing a central hub node "C") *)

starHypergraph = {{"C", 1, 2}, {"C", 3, 4, 5}, {"C", 6, 7}, {"C", 8, 
  9, 10}};

(* 4. 3-Uniform Complete Hypergraph K^3_5 (5 vertices, all 10 possible edges of size 3) *)

complete3UniformK5 = {{1, 2, 3}, {1, 2, 4}, {1, 2, 5}, {1, 3, 4}, {1,
   3, 5}, {1, 4, 5}, {2, 3, 4}, {2, 3, 5}, {2, 4, 5}, {3, 4, 5}};

(* 5. Nested Simplicial Complex (Representing a 2-simplex and its boundaries) *)

simplicialComplex =
  {
    {1, 2, 3}
    ,(* 2-simplex (triangle face) *)
    {1, 4}
    ,
    {2, 4}
    ,
    {3, 4}
    ,(* 1-simplex edges *)
    {5, 6, 7}
    ,(* disconnected triangle *)
    {7, 8}
  };

(* 6. Grid / Lattice Hypergraph (12 vertices, 6 horizontal/vertical 3-edges) *)

gridHypergraph =
  {
    {1, 2, 3}
    ,
    {4, 5, 6}
    ,
    {7, 8, 9}
    ,(* Horizontal edges *)
    {1, 4, 7}
    ,
    {2, 5, 8}
    ,
    {3, 6, 9}
    , (* Vertical edges *)
    {10, 11, 12}
  };

(* 7. Larger Random Hypergraph (15 vertices, 10 hyperedges of sizes 2 to 5) *)

largerRandomHypergraph = {{1, 2, 3, 4}, {3, 5, 6}, {6, 7}, {2, 8, 9},
   {9, 10, 11, 12}, {11, 13}, {13, 14, 15}, {1, 8, 15}, {4, 7, 10, 14},
   {2, 5, 12, 13}};
