const {keccak_256}=require("js-sha3");
for(const f of ["debt(address)","reserves(address)","getCallbacks(uint256)","depositTo(address)","_gasPriceCoeffPer1000()","_extraGas()","_maxChargeGas()","onCheckpoint(address,uint256,address,uint64)"]){console.log(f,"0x"+keccak_256(f).slice(0,8))}
