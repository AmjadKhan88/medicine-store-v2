import {assets} from "../assets/assets";

export default function Loader() {
  return (
    <div style={{height:'100vh', display:'flex',justifyContent:'center',alignItems:'center'}}>

        <img src={assets.loader} alt="Company Logo" width="300" height="100"/>
      
    </div>
  )
}
