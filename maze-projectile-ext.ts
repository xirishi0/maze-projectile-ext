//%icon="\uf135" color="#458FAA"
namespace 弹射物{}
namespace Bullet{
//================== 拓展弹射物 ==================
    //------------- 弹射物注册/定义 -------------
    let projectiles = new Helper.mysprites("弹射物")
    let overlapFunc: (()=>void)[] = []

    //%block
    //%group="自定义弹射物"
    //%blockNamespace=弹射物 
    //%blockId=setProjectiles block="自定义弹射物集合 标记名为%name"
    //%weight=100
    //%afterOnStart=true
    export function setProjectiles(name:string, cb:()=>void){
        cb()
        for(let f of overlapFunc){
            f()
        }
    }

    //%block
    //%group="自定义弹射物"
    //%blockNamespace=弹射物 
    //%blockId=setProjectile block="设置弹射物 %img=screen_image_picker 命名为%name"
    //%weight=81
    //%inlineInputMode=inline
    //%draggableParameters="projectile"
    //% topblock=false
    //% handlerStatement=true
    //%afterOnStart=true
    export function setProjectile(img: Image, name:string, cb:(projectile: wave)=>void){
        Helper.setSprite(projectiles, img, name, cb)
    }

    //%block
    //%group="自定义弹射物"
    //%blockNamespace=弹射物
    //%blockId=strSprites block="弹射物名称 %name"
    //%weight=82
    //%blockSetVariable=spriteName
    export function strSprites(name: string){
        return name
    }

    //------------- 射击 -------------
    //%block
    //%blockNamespace=弹射物
    //%group="动作"
    //%blockId=shoot block="射击 %p=variables_get(sprite) 发射弹射物 %name 从x $x y $y ||朝向角度 $a 速率 $s 与发射点到距离 $d 随方向旋转图像%f=toggleOnOff"
    //%a.defl=0 s.defl=50 x.defl=0 y.defl=0 d.defl=0
    //%weight=99
    //%inlineInputMode=inline
    export function shoot(p: Sprite, name: string, x: number, y: number, 
        a: number = 0, s: number = 50, d: number = 0, f: boolean = false){
        let bullet: Bullet.wave
        let b = projectiles.v[name]
        if(b == undefined){
            console.log("发射的弹射物 '"+name+"' 未定义!")
            return
        }
        bullet = <Bullet.wave>sprites.createProjectileFromSide(b.img.clone(), 0, 0)
        reset(p, bullet)
        if(b.bulletoverlap != undefined){
            bullet.overlapAct = b.bulletoverlap
        }
        let dir = (<Character.Character>p).dir
        a = (a+90*(dir == undefined ? 0 : dir)+90)/57.3
        bullet.changeImg = f
        bullet.setPosition(x+d*Math.cos(a), y+d*Math.sin(a))
        bullet.setVelocity(s*Math.cos(a), s*Math.sin(a))
        changeImg(bullet)

        if(p.kind() == SpriteKind.PlayerWeapon){
            bullet.setKind(SpriteKind.PlayerBullet)
        }
        else{
            let atc = (<Character.Character>p).attachBullet;
            if(atc != null && atc != undefined){
                atc.push(bullet)
            }
            if(p.kind() == SpriteKind.Player || p.kind() == SpriteKind.PlayerServant){
                bullet.setKind(SpriteKind.PlayerBullet)
            }
            else{
                bullet.setKind(SpriteKind.EnemyBullet)
            }
        }
        Helper.currentRequest = new Helper.Request(bullet)
        b.cb(bullet)
        Helper.invoke()
        if(bullet.prism){
            bullet.changeImg = false
            shootprism(bullet, a*57.3)
        }
    }

    function drawPrism(line: Image, c: number, angle: number, width: number,
    color: number = 2, centColor: number = 1){
        let boldLine = (x0: number, y0: number, x: number, y: number)=>{
            line.drawLine(x0, y0, x, y, color)
            // line.drawLine(x0, y0, x+1, y, color)
            // line.drawLine(x0, y0, x, y+1, color)
            // line.drawLine(x0, y0, x+1, y+1, color)
        }
        function drawBoundary(l: number, radius: number, angle: number){
            const sint = Math.sin(angle)
            const cost = Math.cos(angle)
            do{
                boldLine(l-radius*sint, l+radius*cost, 
                            l+l*cost-radius*sint, l+l*sint+radius*cost)
                radius = -radius
            }while(radius < 0)
            line.drawLine(l-radius*sint, l+radius*cost, 
                          l+radius*sint, l-radius*cost, color)
            line.drawLine(l+l*cost-radius*sint, l+l*sint+radius*cost, 
                          l+l*cost+radius*sint, l+l*sint-radius*cost, color)
            let centx0 = (l-radius*sint + l+l*cost+radius*sint)>>1
            let centy0 = (l+radius*cost + l+l*sint-radius*cost)>>1
            return [centx0, centy0]
        }

        if(color == centColor){
            if(color == 1){
                centColor = 2
            }
            else{
                centColor = color-1
            }
        }
        let stk = [drawBoundary(c-1, width/2, angle)]
        let cx = stk[0][0]
        let cy = stk[0][1]
        //填充
        while(stk.length > 0){
            let [x, y] = stk.removeAt(0)
            line.setPixel(x, y, centColor)
            let rightX = x
            //向右填充
            while(line.getPixel(rightX+1, y) != color){
                line.setPixel(++rightX, y, centColor)
            }
            let leftX = x
            //向左填充
            while(line.getPixel(leftX-1, y) != color){
                line.setPixel(--leftX, y, centColor)
            }
            //上下找种子
            for(let i = -1; i < 2; i+=2){
                function unfilled(x0: number, y0: number){
                    return line.getPixel(x0, y0) != color 
                        && line.getPixel(x0, y0) != centColor
                }
                const y0 = y+i
                for(let x0 = leftX; x0 <= rightX; ++x0){
                    //最右的可填充点作为种子入栈
                    if(unfilled(x0, y0) && !unfilled(x0+1, y0)){
                        stk.push([x0, y0])
                    }
                }
                //可能漏掉的最右端点。。
                if(unfilled(rightX, y0) && unfilled(rightX+1, y0)){
                    stk.push([rightX, y0])
                }
            }
        }
    }

    function shootprism(b: wave, a: number){
        a = a%360 
        b.setVelocity(0, 0)
        let line = image.create(b.prismLength*2, b.prismLength*2)
        let x = b.x
        let y = b.y
        b.setImage(line)
        b.setPosition(x, y)
        let clock: number
        drawPrism(line, b.prismLength, a/57.3, b.prismWidth, b.prismColor, b.prismCentColor)
    }

    //------------ 拓展弹射物 ------------
    export class wave extends Sprite{
        damage = 1 //伤害
        hitrec = 100 //被攻击方硬直时间
        backoff = 0 //击退的距离
        rebound = false //反射敌方子弹
        indeflectible = false //不受反射
        perishTogether = 0 //碰撞存活优先级. -1~99, -1时碰撞双方都不会销毁
        collision = 1 //上次碰撞类型：0=>未碰撞/超时重制, 1=>子弹碰子弹, 2=>子弹碰人, 3=>子弹碰武器
        interval = -1 //碰撞后不消亡使用的时钟
        circlock = -1 //转圈时钟
        overlapAct: ((s: wave, o: Sprite)=>void)[] = [] //碰撞后的行为
        dir = 2 //朝向.0:下，1:左，2:上，3:右
        changeImg = false //图像随方向变化
        prism = false //激光
        prismLength = 100 //激光长度
        prismWidth = 3 //激光宽度
        prismColor = 2 //激光边界颜色
        prismCentColor = 1 //激光中心颜色
        own: Sprite = null //所有者
        attachOwner = false //所有者被攻击时自动销毁
        blastAnim: string //爆炸(销毁)动画
        rightImg: Image //右方向图像
    }

    export function reset(owner: Sprite, bullet: wave, damage = 0, hitrec = 100, hurted = 1, 
    backoff = 0, rebound = false, 
    indeflectible = false, perishTogether = 1){
        bullet.own = owner
        bullet.damage = damage //伤害
        bullet.hitrec = hitrec //被攻击方硬直时间
        bullet.backoff = backoff //击退的距离
        bullet.rebound = rebound //反射敌方子弹
        bullet.indeflectible = indeflectible //不受反射
        bullet.perishTogether = perishTogether //碰撞存活优先级
        bullet.collision = 0 //上次碰撞类型：0=>未碰撞/超时重制, 1=>子弹碰子弹, 2=>子弹碰人, 3=>武器碰人
        bullet.interval = -1 //碰撞后不消亡使用的时钟
        bullet.circlock = -1
        bullet.overlapAct = [] //碰撞后的行为
        for(let i = 0; i < 4; ++i){
            bullet.overlapAct.push((s: wave, o: Sprite)=>{})
        }
        bullet.dir = 2 //朝向.0:下，1:左，2:上，3:右
        bullet.changeImg = false //图像随方向变化
        bullet.prism = false //激光
        bullet.prismLength = 100 //激光长度
        bullet.prismWidth = 3 //激光宽度
        bullet.prismColor = 2 //激光边界颜色
        bullet.prismCentColor = 1 //激光中心颜色
        bullet.attachOwner = false //所有者被攻击时自动销毁
        bullet.blastAnim = null //爆炸(销毁)动画
        bullet.rightImg = bullet.image.clone()
    }

    export function changeImg(bullet: wave){
        let angle = (Math.atan2(bullet.vy, bullet.vx)*57.3+360)%360
        if(bullet.changeImg){
            if(angle > 45 && angle <= 135){
                bullet.setImage(Helper.transformImage(bullet.rightImg, -90, Helper.xy0.cent))
                bullet.dir = 0
            }
            else if(angle > 135 && angle <= 225){
                bullet.setImage(Helper.transformImage(bullet.rightImg, -180, Helper.xy0.cent))
                bullet.dir = 1
            }
            else if(angle > 225 && angle <= 315){
                bullet.setImage(Helper.transformImage(bullet.rightImg, 90, Helper.xy0.cent))
                bullet.dir = 2
            }
            else{
                bullet.setImage(bullet.rightImg)
                bullet.dir = 3
            }
        }
    }

    //重叠消亡 k(collision): 0=>未碰撞/超时重置, 1=>子弹碰子弹, 2=>子弹碰人, 3=>武器碰人; v: 碰撞存活优先级
    export function perish(sprite: wave, otherSprite: Sprite, k: number, v: number){
        sprite.collision = k
        sprite.overlapAct[k-1](sprite, otherSprite)
        sprite.overlapAct[3](sprite, otherSprite)
        if(sprite.perishTogether != -1 && sprite.perishTogether <= v){
            sprite.destroy()
            if((<Character.Character>(sprite.own)).attachBullet != undefined){
                let a = (<Character.Character>(sprite.own)).attachBullet
                for(let i = 0; i < a.length; ++i){
                    if(a[i] == sprite){
                        a.removeAt(i)
                        break
                    }
                }
            }
        }
        else{
            if(sprite.interval == -1 && (sprite.collision == 2 || sprite.collision == 3))
            {
                sprite.interval = setTimeout(function() {
                    sprite.interval = -1
                    sprite.collision = 0
                }, 600)
            }
        }
    }

    export enum bulletP{
        //% block="伤害"
        damage,
        //% block="被攻击者硬直(ms)"
        hitrec,
        //% block="击飞距离"
        backoff,
        //% block="碰撞存活优先级"
        perishTogether
    }

    export enum bulletP2{
        //% block="反射敌方弹射物"
        rebound,
        //% block="不受敌方反射"
        indeflectible,
        //% block="发射者被攻击时消亡"
        attachPlayer,
        //%block="激光"
        prism
    }

    //%block
    //%group="属性"
    //%blockNamespace=弹射物 
    //%blockId=setBullet block="设置弹射物%b=variables_get(projectile) 属性 %k=bulletP 为 %v"
    //%v.defl=0
    //%weight=78
    export function setBullet(b:wave, k: bulletP, v: number){
        if(k == bulletP.damage){
            b.damage = v
        }
        else if(k == bulletP.hitrec){
            b.hitrec = v
        }
        else if(k == bulletP.backoff){
            b.backoff = v
        }
        else if(k == bulletP.perishTogether){
            b.perishTogether = Math.min(v, 99)
        }
    }

    //%block
    //%group="属性"
    //%blockNamespace=弹射物 
    //%blockId=setPrismLW block="设置激光弹射物%b=variables_get(projectile) 长%l 宽%w 持续时间%t ms"
    //%l.defl=100 w.defl=3 t.defl=1000
    //%weight=77
    //%inlineInputMode=inline
    export function setPrismLW(b:wave, l: number, w: number, t: number=1000){
        b.prismLength = l
        b.prismWidth = w
        b.lifespan = t
    }

    //%block
    //%group="属性"
    //%blockNamespace=弹射物 
    //%blockId=setPrismColor block="设置激光弹射物%b=variables_get(projectile) 边界颜色%bc=colorindexpicker 中心颜色%cc=colorindexpicker"
    //%weight=76
    export function setPrismColor(b:wave, bc: number, cc: number){
        b.prismColor = Math.floor(Math.min(15, Math.max(0, bc)))
        b.prismCentColor = Math.floor(Math.min(15, Math.max(0, cc)))
    }

    //%block
    //%group="属性"
    //%blockNamespace=弹射物 
    //%blockId=setBullet2 block="设置弹射物%b=variables_get(projectile) 特性 %k=bulletP2 为 %v=toggleOnOff"
    //%v.defl=true
    //%weight=78
    export function setBullet2(b:wave, k: bulletP2, v: boolean){
        if(k == bulletP2.rebound){
            b.rebound = v
        }
        else if(k == bulletP2.indeflectible){
            b.indeflectible = v
        }
        else if(k == bulletP2.attachPlayer){
            b.attachOwner = v
        }
        else if(k == bulletP2.prism){
            b.prism = v
        }
    }

    //%block
    //%group="参数"
    //%blockNamespace=弹射物 
    //%blockId=getBulletV2 block="弹射物%b=variables_get(projectile)的特性 %k=bulletP2"
    //%v.defl=true
    export function getBulletV2(b:wave, k: bulletP2){
        if(k == bulletP2.rebound){
            return b.rebound
        }
        else if(k == bulletP2.indeflectible){
            return b.indeflectible
        }
        else if(k == bulletP2.attachPlayer){
            return b.attachOwner
        }
        return false
    }

    //%block
    //%group="参数"
    //%blockNamespace=弹射物 
    //%blockId=getBulletV block="弹射物%b=variables_get(projectile)的属性 %k=bulletP"
    export function getBulletV(b:wave, k: bulletP){
        if(k == bulletP.damage){
            return b.damage
        }
        else if(k == bulletP.hitrec){
            return b.hitrec
        }
        else if(k == bulletP.backoff){
            return b.backoff
        }
        else if(k == bulletP.perishTogether){
            return b.perishTogether
        }
        return 0
    }

    //%block
    //%group="参数"
    //%blockNamespace=弹射物 
    //%blockId=bulletOwn block="弹射物%b=variables_get(projectile)的发射者"
    //%weight=78
    export function bulletOwn(b: wave){
        return b.own
    }

    //%block
    //%group="参数"
    //%blockNamespace=弹射物 
    //%blockId=spriteToBullet block="将精灵%b=variables_get(sprite)强制转换为弹射物"
    //%weight=99
    export function spriteToBullet(b: Sprite){
        return <wave>b
    }

    //%block
    //%group="特殊效果"
    //%blockNamespace=弹射物 
    //%blockId=splitshoot block="(空爆) %p=variables_get(projectile) 射出 弹射物%name || 偏移x %x y %y朝向角度 $a 速率 $s 与发射点到距离 $d 随方向旋转图像%f=toggleOnOff"
    //%a.defl=0 x.defl=0 y.defl=0 s.defl=50 d.defl=0
    //%weight=78
    //%inlineInputMode=inline
    //% topblock=false
    //% handlerStatement=true
    export function splitshoot(p: wave, name: string, x: number = 0, y: number = 0,  
        a: number = 0, s: number = 50, d: number = 0, f: boolean = false){
        if(!Helper.isDestroyed(p)){
            let bullet: Bullet.wave
            let b = projectiles.v[name]
            if(b == undefined){
                console.log("空爆的弹射物 '"+name+"' 未定义!")
                return
            }
            bullet = <Bullet.wave>sprites.createProjectileFromSide(b.img.clone(), 0, 0)
            reset(p, bullet)
            a = (a+90*p.dir+90)/57.3
            bullet.changeImg = f
            bullet.setPosition(p.x+x+d*Math.cos(a), p.y+y+d*Math.sin(a))
            bullet.setVelocity(s*Math.cos(a), s*Math.sin(a))
            changeImg(bullet)
            bullet.setKind(p.kind())
            Helper.currentRequest = new Helper.Request(bullet)
            b.cb(bullet)
            Helper.invoke()
            if(bullet.prism){
                shootprism(bullet, a*57.3)
            }
        }
    }

    //%block
    //%group="特殊效果"
    //%blockNamespace=弹射物 
    //%blockId=tailshoot block="(尾焰) %p=variables_get(projectile) 每隔%t ms 产生动画 %anim"
    //%t.defl=100
    //%weight=77
    //%inlineInputMode=inline
    export function tailshoot(p: wave, t: number,  anim: string){
        let clock: number
        clock = setInterval(function() {
            if(!Helper.isDestroyed(p)){
                Helper.runAnimationAt(anim, p.x, p.y)
            }
        }, t)
    }

    export enum sKind{
        //%block="人物HP"
        HP,
        //%block="武器耐久度"
        NUM
    }

    export enum overlapKind{
        //% block="敌方弹射物"
        one = 1,
        //% block="敌方精灵"
        two = 2,
        //% block="敌方武器"
        three = 3,
        //% block="任意敌方物体"
        four = 4
    }

    //%block
    //% blockId=bulletOverlap block="当弹射物%name $projectile 与%kind $otherSprite 重叠时" 
    //% group="特殊效果"
    //% blockNamespace=弹射物 
    //% weight=99
    //%afterOnStart=true
    //% draggableParameters="projectile otherSprite"
    export function bulletOverlap(name: string, kind: overlapKind, func: (projectile: wave, otherSprite: Sprite) => void) {
        
        overlapFunc.push(()=>{    
            let p = projectiles.v[name]
            if(projectiles.v[name] == undefined){
                console.log("重叠的弹射物 '"+name+"' 未定义!")
                return
            }
            if(p.bulletoverlap == undefined){
                p.bulletoverlap = [] //碰撞后的行为
                for(let i = 0; i < 4; ++i){
                    p.bulletoverlap.push((s: wave, o: Sprite)=>{})
                }
            }
            p.bulletoverlap[kind-1] = func
        })
    }

    //% blockId=bulletInterval block="每隔%t 秒 持续执行 直到 %p=variables_get(projectile) 消亡" 
    //% topblock=false
    //% group="特殊效果"
    //%blockNamespace=弹射物 
    //% handlerStatement=true
    //% draggableParameters="reporter"
    //% weight=75
    export function bulletInterval(t: number, p: wave, func: () => void) {
        let clock: number
        clock = setInterval(()=>{
            if(Helper.isDestroyed(p)){
                clearInterval(clock)
            }
            else{
                func()
            }
        }, t*1000)
    }

    //%block
    //%group="特殊效果"
    //%blockNamespace=弹射物 
    //%blockId=setBlastAnim block="设定 %sprite=variables_get(projectile) 爆炸动画 %anim"
    //%inlineInputMode=inline
    //%interval.defl=100
    //%weight=74
    export function setBlastAnim(b: wave, anim: string){
        b.blastAnim = anim
    }

    export enum clockwise{
        //% block="顺"
        p,
        //% block="逆"
        n
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=turnTo block="偏移 %p=variables_get(projectile) 转向角度 %angle ||速率%v"
    //%angle.defl=0 v.defl=1146
    //%inlineInputMode=inline
    export function turnTo(sprite: Sprite, angle: number, v: number = 1146){
        let speed = Math.sqrt(sprite.vx*sprite.vx+sprite.vy*sprite.vy)
        angle = (angle+180)/57.3
        let angle0 = Math.atan2(sprite.vy, sprite.vx)
        v = Math.min(v, 1146)
        let clock: number
        clock = setInterval(()=>{
            if(Math.abs(angle-angle0)%(2*Math.PI)<= 1/57.3)
            {
                angle0 = angle
                clearInterval(clock)
            }
            else{
                angle0 += (angle-angle0)*v/573/2
            }
            sprite.setVelocity(speed*Math.cos(angle0),speed*Math.sin(angle0))
        }, 0)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=stopcircular block="停止转圈 %p=variables_get(projectile)"
    export function stopcircular(sprite: Sprite){
        clearInterval((<wave>sprite).circlock);
        (<wave>sprite).circlock = -1
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=circular block="转圈 %p=variables_get(projectile) ||半径%r 半径递增速率%v %t 时针 偏移速率%ov 偏移角度%oa"
    //%r.defl=30 v=0 t.defl=clockwise.p ov.defl=0 oa.defl=180
    //%inlineInputMode=inline
    export function circular(sprite: Sprite, r: number = 30, v: number = 0, 
    t: clockwise = clockwise.p, ov: number = 0, oa: number = 180){
        let speed = Math.max(Math.sqrt(sprite.vx*sprite.vx+sprite.vy*sprite.vy), 10)
        let angle0 = Math.atan2(sprite.vy, sprite.vx)
        //r = Math.max(r, 0)
        oa = (oa+180)/57.3
        let vx = ov*Math.cos(oa)
        let vy = ov*Math.sin(oa)
        if((<wave>sprite).dir == 2 && t == clockwise.n || (<wave>sprite).dir == 1 && t == clockwise.p){
            r = -r
            v = -v
        }
        if((<wave>sprite).dir == 1){
            vx = -vx
        }
        let dir = (<wave>sprite).dir;
        (<wave>sprite).circlock = setInterval(()=>{
            if(Helper.isDestroyed(sprite)){
                clearInterval((<wave>sprite).circlock);
                (<wave>sprite).circlock = -1
            }
            else if(dir != (<wave>sprite).dir){
                r = -r
                v = -v
                vx = -vx
                dir = (<wave>sprite).dir
            }
            angle0 = (angle0+1/r)%(2*Math.PI)
            r+=v/57.3
            sprite.setVelocity(speed*Math.cos(angle0) + vx,speed*Math.sin(angle0) + vy)
        }, 0)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=movetoxy block="移动 %sprite=variables_get(projectile) 在%time 秒内接近 位置x %desx y %desy"
    //%inlineInputMode=inline
    export function movetoxy (sprite: Sprite, time: number, desx: number, desy: number) {
        movetox(sprite, time, desx)
        movetoy(sprite, time, desy)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=movetox block="移动 %sprite=variables_get(projectile) 在%time 秒内接近 位置x %desx"
    //%inlineInputMode=inline
    export function movetox (sprite: Sprite, time: number, desx: number) {
        let clock: number
        clock = setInterval(()=>{
            sprite.vx = 4 * (desx - sprite.x) / time
            if(Math.abs(desx - sprite.x) < 0.5){
                sprite.vx = 0
                clearInterval(clock)
                clock = -1
            }
        }, 0)
        setTimeout(()=>{
            clearInterval(clock)
            clock = -1
        }, time*1000+1)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=movetoy block="移动 %sprite=variables_get(projectile) 在%time 秒内接近 位置y %desy"
    //%inlineInputMode=inline
    export function movetoy (sprite: Sprite, time: number, desy: number) {
        let clock: number
        clock = setInterval(()=>{
            sprite.vy = 4 * (desy - sprite.y) / time
            if(Math.abs(desy - sprite.y) < 0.5){
                sprite.vy = 0
                clearInterval(clock)
                clock = -1
            }
        }, 0)
        setTimeout(()=>{
            clearInterval(clock)
            clock = -1
        }, time*1000+1)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=movexy block="移动 %sprite=variables_get(projectile) 在%time 秒内移动 x %dx y %dy"
    //%inlineInputMode=inline
    export function movexy (sprite: Sprite, time: number, dx: number, dy: number) {
        if(dx != 0){
            movetox(sprite, time, sprite.x+dx)
        }
        if(dy != 0){
            movetoy(sprite, time, sprite.y+dy)
        }
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=accelerateToV block="加速 %sprite=variables_get(projectile) 在%time 秒内加速 vx* %dx 倍 vy* %dy 倍"
    //%inlineInputMode=inline
    export function acceToV (sprite: Sprite, time: number, vx: number, vy: number) {
        vx = sprite.vx * vx
        vy = sprite.vy * vy
        let ax = sprite.ax
        let ay = sprite.ay
        let clock = setInterval(()=>{
            sprite.ax = 4*(vx-sprite.vx)/time
            sprite.ay = 4*(vy-sprite.vy)/time
        }, 0)
        setTimeout(()=>{
            clearInterval(clock)
            sprite.setVelocity(vx, vy)
            sprite.ax = ax
            sprite.ay = ay
        }, time*1000)
    }

    //------------- 自机狙 -------------

    export enum pnKind{
        //%block="正向"
        p = 1,
        //%block="反向"
        n = -1
    }

    //_from转向strKeyo方向. k=1 => 正方向； k=-1 => 反方向
    export function changeDir(_from: Bullet.wave, strKeyo: Sprite, k: pnKind = 1){
        let s = Helper.compSpeed(_from) * k
        let a = Helper.compAngle(_from, strKeyo)
        _from.setVelocity(s*Math.cos(a), s*Math.sin(a))
        changeImg(_from)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=aimedshot2 block="(自机狙) %bullet=variables_get(projectile) 跟踪最近的敌人 ||最大范围 %d 跟踪间隔 %t 命中后继续跟随 %c=toggleOnOff"
    //%inlineInputMode=inline
    //%d.defl=100 t.defl=100
    export function aimedshot2(bullet: wave, d: number = 2147483647, t: number =100, c: boolean = false){
        let e: Sprite
        if(bullet.kind() == SpriteKind.EnemyBullet){
            e = nearestPlayer(bullet, d)
        }
        else{
            e = nearestEnemy(bullet, d)
        }
        if(e == null){
            let s = Helper.compSpeed(bullet)
            let a = randint(0, 360)/57.3
            bullet.setVelocity(s*Math.cos(a), s*Math.sin(a))
            Bullet.changeImg(bullet)
            return
        }
        let clock: number
        changeDir(bullet, e)
        clock = setInterval(()=>{
            if((!c && Helper.distance(bullet, e) <= 10) || Helper.isDestroyed(bullet) || Helper.isDestroyed(e)){
                clearInterval(clock)
            }
            else{
                changeDir(bullet, e)
            }
        }, t)
    }

    //%block
    //%group="行为/轨迹"
    //%blockNamespace=弹射物 
    //%blockId=aimedshot block="(自机狙) %bullet=variables_get(projectile) 转向最近的敌人 ||最大范围 %d"
    //%inlineInputMode=inline
    //%d.defl=100
    export function aimedshot(bullet: wave, d: number = 2147483647){
        let e: Sprite
        if(bullet.kind() == SpriteKind.EnemyBullet){
            e = nearestPlayer(bullet, d)
            // e = Helper.distance(bullet, Player.curPlayer) <= d ? Player.curPlayer : null
        }
        else{
            e = nearestEnemy(bullet, d)
        }
        if(e != null){
            changeDir(bullet, e)
            return
        }
        let s = Helper.compSpeed(bullet)
        let a = randint(0, 360)/57.3
        bullet.setVelocity(s*Math.cos(a), s*Math.sin(a))
        Bullet.changeImg(bullet)
    }


    //% blockId=setHp block="修改%s=variables_get(character)的HP 以%d" 
    //% group="特殊效果"
    //%blockNamespace=弹射物 
    //% d.defl=-1
    //% weight=99
    export function setHp(s: Sprite, d: number){
        let c = <Character.Character>s
        if(c.hpbar != undefined){
            c.hpbar.value += d*c.def
        }
    }


    //------------- 自机狙需要的迷宫相关信息 -------------
    export let curEnemyRoom: {[key: string]: Sprite; } = {} //迷宫怪物
    export let curPlayer: Sprite = null //当前玩家

    export function setCurPlayer(player: Sprite){
        curPlayer = player
    }

    function nearestPlayer(bullet: wave, d: number){
        let playerDis = Helper.distance(bullet, curPlayer)
        let e = playerDis <= d ? curPlayer : null
        let servant = nearestServant(bullet, d)
        if(servant != null && Helper.distance(bullet, servant) < playerDis){
            e = <Character.Character>servant
        }
        return e
    }

    export function nearestEnemy(s: Sprite, d: number = 2147483647){
        let ret: Sprite = null
        let mn = 2147483647
        for(let key of Object.keys(curEnemyRoom)){
            let t = Helper.distance(s, curEnemyRoom[key])
            if(t <= d && t < mn){
                mn = t
                ret = curEnemyRoom[key]
            }
        }
        return ret
    }

    export function nearestServant(s: Sprite, d: number = 2147483647){
        let ret: Sprite = null
        let mn = 2147483647
        for(let ps of sprites.allOfKind(SpriteKind.PlayerServant)){
            let t = Helper.distance(s, ps)
            if(t <= d && t < mn){
                mn = t
                ret = <Sprite>ps
            }
        }
        return ret
    }
}